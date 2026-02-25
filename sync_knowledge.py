# -*- coding: utf-8 -*-
"""
知識庫 → Vite 網站同步腳本 v2.0
從 RAG 知識庫查詢佛學、思維、哲學、AI、資訊相關內容
輸出 JSON 到 public/data/，供 Vite React 網站使用

同步記錄：sync-log.json（加速增量同步）
用法：
  python sync_knowledge.py          # 增量同步（只處理新增/變更）
  python sync_knowledge.py --force  # 強制全量重建
  python sync_knowledge.py --pages 5 # 指定最多取幾頁（每頁 100 筆）
"""
import json
import hashlib
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ─── 配置 ────────────────────────────────────────────
KB_API = "http://localhost:3000"
OUTPUT_DIR = "d:/source/knowledge"
DATA_DIR   = f"{OUTPUT_DIR}/public/data"
ART_DIR    = f"{DATA_DIR}/articles"
LOG_PATH   = f"{OUTPUT_DIR}/sync-log.json"
PAGE_SIZE  = 100   # 每頁筆數
MAX_PAGES  = 20    # 最多取頁數（可用 --pages 覆蓋）

# ─── 主題篩選關鍵字 ──────────────────────────────────
KEYWORDS = [
    # 佛學
    '佛', '楞嚴', '禪', '心經', '金剛', '維摩', '淨土', '法華', '教觀', '阿彌陀',
    '菩薩', '般若', '戒律', '修行', '天台', '唯識',
    # 思維 / 哲學
    '思維', '邏輯', '哲學', '認知', '心智', '費曼', '批判', '決策', '方法論',
    '結構化', '洞見', '框架', '原則',
    # AI / 技術
    'AI', 'LLM', 'Claude', 'GPT', 'Agent', 'Gemini', '模型', '深度學習', '機器學習',
    'RAG', 'MCP', 'Anthropic', 'DeepSeek', 'Unsloth', 'DensePose',
    'LangChain', 'LangGraph', 'Dify', 'vLLM',
    # 資訊 / 工程
    '程式', '資訊', '技術', 'API', 'GitHub', 'WiFi', 'JSONL', 'QA',
    'Hook', 'Skill', 'Log', '優化', '架構', '系統',
    # 其他常見
    '遊戲', 'Canvas', 'HTML5', '正念', '安全', 'Daily-Digest', '知識庫',
    '研究', '開源', '趨勢', '洞察',
]

# ─── 排除關鍵字（標題含任一詞者跳過）────────────────
EXCLUDE_KEYWORDS = [
    '報告',
    '專案優化',
]

# ─── 分類邏輯（順序決定優先級）───────────────────────
def categorize(title: str, tags: list[str]) -> tuple[str, str]:
    combined = title + ' ' + ','.join(tags)
    rules = [
        (['佛', '楞嚴', '禪', '心經', '金剛', '維摩', '淨土', '法華', '教觀', '阿彌陀', '菩薩', '般若', '天台'],
         '佛學', 'buddhism'),
        (['遊戲', 'Canvas遊戲', 'HTML5遊戲', '貪吃蛇', '配對遊戲', '打字遊戲', 'Pong', 'Space Invader'],
         '遊戲開發', 'game'),
        (['Claude', 'claude-code', 'Claude Code', 'Daily-Digest', 'daily-digest', 'Skill品質', 'Hook', 'Hooks'],
         'Claude Code', 'claude'),
        (['AI', 'LLM', 'GPT', 'Gemini', '深度學習', '機器學習', 'Agent', 'LangChain', 'LangGraph',
          'Anthropic', 'DeepSeek', 'Unsloth', 'DensePose', 'vLLM', 'Dify', 'RAG', 'MCP'],
         'AI技術', 'ai'),
        (['安全', 'SQL注入', 'Cookie', 'QA System', 'security', '資安', '漏洞'],
         '資訊安全', 'security'),
        (['思維', '邏輯', '哲學', '認知', '心智', '決策', '批判', '方法論', '費曼', '洞見', '結構化分析'],
         '思維方法', 'thinking'),
        (['GitHub熱門', '開源專案', 'GitHub趨勢', 'GitHub Scout'],
         '開源生態', 'opensource'),
    ]
    for keywords, cat_name, cat_slug in rules:
        if any(k in combined for k in keywords):
            return cat_name, cat_slug
    return '其他', 'other'


# ─── 工具函數 ─────────────────────────────────────────
def content_hash(title: str, text: str) -> str:
    raw = title + (text[:500] if text else '')
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def generate_slug(title: str, note_id: str) -> str:
    """生成 URL slug，保留中文與 ASCII（Cloudflare Pages 支援 Unicode 靜態資源）。"""
    short_id = note_id[:8]
    slug = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', title[:30])
    slug = re.sub(r'\s+', '-', slug).lower()
    return f"{slug}-{short_id}" if slug else f"article-{short_id}"


def estimate_reading_time(text: str) -> int:
    cjk = len(re.findall(r'[\u4e00-\u9fff\u3400-\u4dbf]', text or ''))
    words = len(re.findall(r'[a-zA-Z]+', text or ''))
    return max(1, round(cjk / 400 + words / 200))


def api_get(path: str, retries: int = 3) -> dict:
    url = f"{KB_API}{path}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"API 請求失敗 {url}: {e}")
            time.sleep(2 ** attempt)
    return {}


# ─── Tiptap → HTML 轉換 ──────────────────────────────
def tiptap_to_html(content_json) -> str:
    if not content_json:
        return ""
    try:
        doc = json.loads(content_json) if isinstance(content_json, str) else content_json
    except (json.JSONDecodeError, TypeError):
        return ""

    def esc(s: str) -> str:
        return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

    def render_marks(text: str, marks: list) -> str:
        result = esc(text)
        for m in marks or []:
            t = m.get('type', '')
            if t == 'bold':     result = f"<strong>{result}</strong>"
            elif t == 'italic': result = f"<em>{result}</em>"
            elif t == 'code':   result = f"<code>{result}</code>"
            elif t == 'link':
                href = m.get('attrs', {}).get('href', '#')
                result = f'<a href="{esc(href)}" target="_blank" rel="noopener">{result}</a>'
        return result

    def render(node: dict) -> str:
        nt = node.get('type', '')
        children = node.get('content', [])
        attrs = node.get('attrs', {})

        if nt == 'doc':          return ''.join(render(c) for c in children)
        if nt == 'paragraph':
            inner = ''.join(render(c) for c in children)
            return f"<p>{inner}</p>\n" if inner.strip() else ""
        if nt == 'heading':
            lv = attrs.get('level', 2)
            inner = ''.join(render(c) for c in children)
            slug = re.sub(r'[^\w\u4e00-\u9fff]+', '-', re.sub(r'<[^>]+>', '', inner)).strip('-').lower()[:40]
            return f"<h{lv} id=\"{slug}\">{inner}</h{lv}>\n"
        if nt == 'text':
            return render_marks(node.get('text', ''), node.get('marks', []))
        if nt == 'bulletList':   return f"<ul>\n{''.join(render(c) for c in children)}</ul>\n"
        if nt == 'orderedList':  return f"<ol>\n{''.join(render(c) for c in children)}</ol>\n"
        if nt == 'listItem':
            inner = ''.join(render(c) for c in children)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip(), flags=re.DOTALL)
            return f"<li>{inner}</li>\n"
        if nt == 'blockquote':   return f"<blockquote>{''.join(render(c) for c in children)}</blockquote>\n"
        if nt == 'codeBlock':
            code = ''.join(c.get('text', '') for c in children)
            lang = attrs.get('language', '')
            return f'<pre><code class="language-{lang}">{esc(code)}</code></pre>\n'
        if nt == 'horizontalRule': return "<hr>\n"
        if nt == 'table':        return f"<table>\n{''.join(render(c) for c in children)}</table>\n"
        if nt == 'tableRow':     return f"<tr>{''.join(render(c) for c in children)}</tr>\n"
        if nt == 'tableCell':
            inner = ''.join(render(c) for c in children)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip(), flags=re.DOTALL)
            return f"<td>{inner}</td>"
        if nt == 'tableHeader':
            inner = ''.join(render(c) for c in children)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip(), flags=re.DOTALL)
            return f"<th>{inner}</th>"
        return ''.join(render(c) for c in children)

    return render(doc)


def extract_headings(html: str) -> list[dict]:
    headings = []
    for m in re.finditer(r'<h([23]) id="([^"]*)">(.*?)</h[23]>', html, re.DOTALL):
        text = re.sub(r'<[^>]+>', '', m.group(3)).strip()
        if text:
            headings.append({'level': int(m.group(1)), 'text': text, 'slug': m.group(2)})
    return headings


# ─── 主程式 ───────────────────────────────────────────
def main():
    sys.stdout.reconfigure(encoding='utf-8')

    force_rebuild = '--force' in sys.argv
    max_pages = MAX_PAGES
    if '--pages' in sys.argv:
        idx = sys.argv.index('--pages')
        if idx + 1 < len(sys.argv):
            max_pages = int(sys.argv[idx + 1])

    # 建立目錄
    os.makedirs(ART_DIR, exist_ok=True)

    # 讀取舊同步記錄
    if os.path.exists(LOG_PATH):
        with open(LOG_PATH, 'r', encoding='utf-8') as f:
            sync_log = json.load(f)
    else:
        sync_log = {'synced_notes': [], 'last_sync': None, 'stats': {}}

    synced_hashes = {n['id']: n.get('hash', '') for n in sync_log.get('synced_notes', [])}

    # ─── 擷取所有筆記 ────────────────────────────────
    print("⬇ 從知識庫擷取筆記...")
    all_notes: list[dict] = []
    offset = 0
    page = 0
    while page < max_pages:
        try:
            resp = api_get(f"/api/notes?limit={PAGE_SIZE}&offset={offset}")
        except RuntimeError as e:
            print(f"  ⚠ API 錯誤：{e}")
            break
        batch = resp.get('notes', [])
        if not batch:
            break
        all_notes.extend(batch)
        print(f"  取得第 {page+1} 頁，共 {len(batch)} 筆（累計 {len(all_notes)} 筆）")
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        page += 1

    print(f"  總計 {len(all_notes)} 筆筆記")

    # ─── 篩選相關主題 ────────────────────────────────
    filtered: list[dict] = []
    excluded_count = 0
    for n in all_notes:
        title = n.get('title', '')
        if not title:
            continue
        # 排除含 EXCLUDE_KEYWORDS 的標題
        if any(k in title for k in EXCLUDE_KEYWORDS):
            excluded_count += 1
            continue
        tags = n.get('tags', []) or []
        combined = title + ' ' + ','.join(tags)
        if any(k in combined for k in KEYWORDS):
            filtered.append(n)

    if excluded_count:
        print(f"  排除含關鍵字筆記：{excluded_count} 篇（EXCLUDE_KEYWORDS）")

    print(f"  篩選後相關筆記：{len(filtered)} 篇")

    # ─── Pass 1：收集 metadata ─────────────────────
    note_meta: list[tuple] = []
    articles_by_cat: dict[str, list] = {}

    for note in filtered:
        note_id = note['id']
        title = note.get('title', 'Untitled')
        tags = note.get('tags', []) or []
        content_text = note.get('contentText', '') or ''
        updated = note.get('updatedAt', '')[:10]

        note_hash = content_hash(title, content_text)
        old_hash = synced_hashes.get(note_id, '')
        need_update = force_rebuild or (old_hash != note_hash)

        cat_name, cat_slug = categorize(title, tags)
        slug = generate_slug(title, note_id)

        excerpt = re.sub(r'[#*\->\[\]`]', '', content_text)
        excerpt = re.sub(r'\s+', ' ', excerpt).strip()[:120]
        reading_min = estimate_reading_time(content_text)

        art_meta = {
            'id': note_id,
            'title': title,
            'slug': slug,
            'category': cat_name,
            'categorySlug': cat_slug,
            'tags': tags,
            'updatedAt': updated,
            'excerpt': excerpt,
            'readingMin': reading_min,
        }

        if cat_name not in articles_by_cat:
            articles_by_cat[cat_name] = []
        articles_by_cat[cat_name].append(art_meta)
        note_meta.append((note, art_meta, cat_name, cat_slug, slug, note_hash, need_update))

    # ─── Pass 1.5：排序建立上下篇索引 ────────────────
    nav_map: dict[str, dict] = {}
    for cat_name, arts in articles_by_cat.items():
        sorted_arts = sorted(arts, key=lambda x: x.get('updatedAt', ''), reverse=True)
        articles_by_cat[cat_name] = sorted_arts
        for i, art in enumerate(sorted_arts):
            prev = sorted_arts[i - 1] if i > 0 else None
            nxt = sorted_arts[i + 1] if i < len(sorted_arts) - 1 else None
            nav_map[art['id']] = {
                'prev': {'slug': prev['slug'], 'title': prev['title']} if prev else None,
                'next': {'slug': nxt['slug'], 'title': nxt['title']} if nxt else None,
            }

    # ─── 標記新文章（比對舊 sync log）───────────────
    old_ids = {n['id'] for n in sync_log.get('synced_notes', [])}
    new_ids = {a[1]['id'] for a in note_meta if a[1]['id'] not in old_ids}

    for item in note_meta:
        item[1]['isNew'] = item[1]['id'] in new_ids

    # ─── Pass 2：生成文章 JSON ────────────────────────
    new_count = updated_count = skipped_count = 0

    for note, art_meta, cat_name, cat_slug, slug, note_hash, need_update in note_meta:
        if need_update:
            html = tiptap_to_html(note.get('content'))
            headings = extract_headings(html)
            nav = nav_map.get(art_meta['id'], {})

            art_detail = {
                **art_meta,
                'html': html,
                'headings': headings,
                'prev': nav.get('prev'),
                'next': nav.get('next'),
            }

            out_path = f"{ART_DIR}/{slug}.json"
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(art_detail, f, ensure_ascii=False, separators=(',', ':'))

            if art_meta['id'] in old_ids:
                updated_count += 1
            else:
                new_count += 1
        else:
            skipped_count += 1

    # ─── 生成 index.json ─────────────────────────────
    # 按分類收集，每類按更新時間排序
    all_articles: list[dict] = []
    cat_counts: dict[str, int] = {}
    cat_order = ['佛學', '思維方法', 'AI技術', 'Claude Code', '遊戲開發', '資訊安全', '開源生態', '其他']

    for cat in cat_order:
        arts = articles_by_cat.get(cat, [])
        cat_counts[cat] = len(arts)
        all_articles.extend(arts)

    # 加上不在預定順序中的分類
    for cat, arts in articles_by_cat.items():
        if cat not in cat_order:
            cat_counts[cat] = len(arts)
            all_articles.extend(arts)

    index_data = {
        'articles': all_articles,
        'stats': {
            'total': len(all_articles),
            'categories': cat_counts,
            'lastSync': datetime.now().isoformat(),
        }
    }

    index_path = f"{DATA_DIR}/index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\n✅ index.json 已寫入：{len(all_articles)} 篇文章")

    # ─── 更新 sync-log.json ───────────────────────────
    synced_notes = [
        {
            'id': art_meta['id'],
            'title': art_meta['title'],
            'slug': art_meta['slug'],
            'category': cat_name,
            'hash': note_hash,
        }
        for _, art_meta, cat_name, _, _, note_hash, _ in note_meta
    ]

    new_log = {
        'last_sync': datetime.now().isoformat(),
        'synced_notes': synced_notes,
        'stats': {
            'total_articles': len(all_articles),
            'categories': cat_counts,
        }
    }

    with open(LOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(new_log, f, ensure_ascii=False, indent=2)

    # ─── 清理舊 HTML 文章（遷移後可選執行）───────────
    old_html_dir = f"{OUTPUT_DIR}/articles"
    if os.path.isdir(old_html_dir):
        html_files = [f for f in os.listdir(old_html_dir) if f.endswith('.html')]
        if html_files:
            print(f"\n💡 提示：舊 articles/ 目錄有 {len(html_files)} 個 HTML 文章檔案")
            print("   可執行 'python sync_knowledge.py --clean-html' 清理（不影響新網站）")

    if '--clean-html' in sys.argv:
        if os.path.isdir(old_html_dir):
            import shutil
            shutil.rmtree(old_html_dir)
            print(f"✅ 已清理舊 articles/ 目錄")

    # ─── 摘要 ─────────────────────────────────────────
    print(f"\n📊 同步摘要：")
    print(f"  新增：{new_count} 篇")
    print(f"  更新：{updated_count} 篇")
    print(f"  跳過：{skipped_count} 篇（無變更）")
    print(f"  總計：{len(all_articles)} 篇")
    print(f"\n分類統計：")
    for cat, count in cat_counts.items():
        if count > 0:
            print(f"  {cat}：{count} 篇")
    print(f"\n📁 輸出目錄：{DATA_DIR}")
    print("🚀 執行 'npm run build' 建置 Vite 網站")


if __name__ == '__main__':
    main()
