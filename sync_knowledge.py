# -*- coding: utf-8 -*-
"""
知識庫轉網站同步腳本
從 RAG 知識庫查詢佛學、思維、哲學、AI、資訊相關內容
轉換為靜態 HTML 網站，可部署至 Cloudflare Pages
"""
import json
import hashlib
import os
import re
from datetime import datetime
from html import escape

# 配置
KB_API = "http://localhost:3000"
OUTPUT_DIR = "d:/source/knowledge"
ARTICLES_DIR = f"{OUTPUT_DIR}/articles"

# 相關主題關鍵字
KEYWORDS = [
    '佛', '楞嚴', '禪', '心經', '金剛', '維摩', '淨土', '法華', '教觀', '阿彌陀',
    '思維', '邏輯', '哲學', '認知', '心智', '費曼', '批判',
    'AI', 'LLM', 'Claude', 'GPT', 'Agent', 'Gemini', '模型', '深度學習', '機器學習',
    '程式', '資訊', '技術', 'API', 'MCP', 'RAG', 'Anthropic', '研究', '決策', '方法',
    '遊戲', 'Canvas', 'HTML5', '正念', '安全', 'Hook', 'Skill', 'Log', '優化',
    'GitHub', 'WiFi', 'Unsloth', 'JSONL', 'QA', 'DensePose', 'DeepSeek',
    'Daily-Digest', 'daily-digest', '知識庫', '系統', '洞見'
]

# 分類映射（順序決定優先級）
def categorize(title, tags):
    tags_str = ','.join(tags) if tags else ''
    combined = title + tags_str
    if any(k in combined for k in ['佛', '楞嚴', '禪', '心經', '金剛', '維摩', '咒', '淨土', '法華', '教觀', '阿彌陀']):
        return '佛學', 'buddhism'
    if any(k in combined for k in ['遊戲', 'Canvas遊戲', 'HTML5遊戲', '正念記憶', '六根淨化', '貪吃蛇', '配對遊戲', '打字遊戲', 'game']):
        return '遊戲開發', 'game'
    if any(k in combined for k in ['Claude', 'claude-code', 'Claude Code', 'Daily-Digest', 'daily-digest', 'Skill品質', 'Hook', 'Hooks']):
        return 'Claude_Code', 'claude'
    if any(k in combined for k in ['AI', 'LLM', 'GPT', 'Gemini', '模型', '深度學習', '機器學習', 'Agent', 'LangGraph', 'Anthropic', 'DeepSeek', 'Unsloth', 'DensePose', 'WiFi']):
        return 'AI技術', 'ai'
    if any(k in combined for k in ['安全', 'SQL注入', 'Cookie', 'QA System', 'security']):
        return '資訊安全', 'security'
    if any(k in combined for k in ['思維', '邏輯', '哲學', '認知', '心智', '決策', '批判', '方法論', '費曼', '學習法', '洞見']):
        return '思維方法', 'thinking'
    if any(k in combined for k in ['GitHub熱門', '開源專案', 'GitHub趨勢']):
        return '開源生態', 'opensource'
    return '其他', 'other'

def generate_slug(title, note_id):
    """生成 URL-friendly slug"""
    slug = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', title[:30])
    slug = re.sub(r'\s+', '-', slug).lower()
    return f"{slug}-{note_id[:8]}" if slug else f"article-{note_id[:8]}"

def content_hash(title, content_text):
    """計算內容雜湊用於判斷是否更新"""
    text = (title + (content_text[:500] if content_text else ''))
    return hashlib.md5(text.encode()).hexdigest()[:8]

def tiptap_to_html(content_json):
    """將 Tiptap JSON 轉換為 HTML"""
    if not content_json:
        return ""

    try:
        if isinstance(content_json, str):
            doc = json.loads(content_json)
        else:
            doc = content_json
    except:
        return ""

    def render_marks(text, marks):
        if not marks:
            return escape(text)
        result = escape(text)
        for mark in marks:
            mark_type = mark.get('type', '')
            if mark_type == 'bold':
                result = f"<strong>{result}</strong>"
            elif mark_type == 'italic':
                result = f"<em>{result}</em>"
            elif mark_type == 'code':
                result = f"<code>{result}</code>"
            elif mark_type == 'link':
                href = mark.get('attrs', {}).get('href', '#')
                result = f'<a href="{escape(href)}">{result}</a>'
        return result

    def render_node(node):
        node_type = node.get('type', '')
        content = node.get('content', [])
        attrs = node.get('attrs', {})

        if node_type == 'doc':
            return ''.join(render_node(c) for c in content)
        elif node_type == 'paragraph':
            inner = ''.join(render_node(c) for c in content)
            return f"<p>{inner}</p>\n" if inner else ""
        elif node_type == 'heading':
            level = attrs.get('level', 2)
            inner = ''.join(render_node(c) for c in content)
            return f"<h{level}>{inner}</h{level}>\n"
        elif node_type == 'text':
            text = node.get('text', '')
            marks = node.get('marks', [])
            return render_marks(text, marks)
        elif node_type == 'bulletList':
            items = ''.join(render_node(c) for c in content)
            return f"<ul>\n{items}</ul>\n"
        elif node_type == 'orderedList':
            items = ''.join(render_node(c) for c in content)
            return f"<ol>\n{items}</ol>\n"
        elif node_type == 'listItem':
            inner = ''.join(render_node(c) for c in content)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip())
            return f"<li>{inner}</li>\n"
        elif node_type == 'blockquote':
            inner = ''.join(render_node(c) for c in content)
            return f"<blockquote>{inner}</blockquote>\n"
        elif node_type == 'codeBlock':
            code = ''.join(c.get('text', '') for c in content)
            lang = attrs.get('language', '')
            return f'<pre><code class="language-{lang}">{escape(code)}</code></pre>\n'
        elif node_type == 'horizontalRule':
            return "<hr>\n"
        elif node_type == 'table':
            rows = ''.join(render_node(c) for c in content)
            return f"<table>\n{rows}</table>\n"
        elif node_type == 'tableRow':
            cells = ''.join(render_node(c) for c in content)
            return f"<tr>{cells}</tr>\n"
        elif node_type == 'tableCell':
            inner = ''.join(render_node(c) for c in content)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip())
            return f"<td>{inner}</td>"
        elif node_type == 'tableHeader':
            inner = ''.join(render_node(c) for c in content)
            inner = re.sub(r'^<p>(.*)</p>\s*$', r'\1', inner.strip())
            return f"<th>{inner}</th>"
        else:
            return ''.join(render_node(c) for c in content)

    return render_node(doc)

def generate_article_html(note, category_name, category_slug):
    """生成文章頁面 HTML"""
    title = note.get('title', 'Untitled')
    tags = note.get('tags', []) or []
    content = note.get('content')
    updated = note.get('updatedAt', '')[:10]

    article_html = tiptap_to_html(content)
    tags_html = ''.join(f'<span class="tag">{escape(t)}</span>' for t in tags[:8])

    return f'''<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{escape(title)}">
  <title>{escape(title)} | 知識庫</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header>
    <div class="container">
      <a href="../" class="logo">知識庫</a>
      <nav>
        <a href="../#buddhism">佛學</a>
        <a href="../#thinking">思維方法</a>
        <a href="../#ai">AI技術</a>
        <a href="../#claude">Claude Code</a>
        <a href="../#game">遊戲</a>
      </nav>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="切換深色模式">
        <span class="theme-icon">◐</span>
      </button>
    </div>
  </header>

  <main class="container">
    <article>
      <div class="article-header">
        <span class="category-badge category-{category_slug}">{category_name.replace('_', ' ')}</span>
        <h1>{escape(title)}</h1>
        <div class="article-meta">
          <span class="date">{updated}</span>
          <div class="tags">{tags_html}</div>
        </div>
      </div>

      <div class="article-content">
        {article_html}
      </div>

      <a href="../" class="back-link">&larr; 返回首頁</a>
    </article>
  </main>

  <footer>
    <div class="container">
      <p>Powered by RAG Knowledge Base</p>
    </div>
  </footer>
  <script>
    function toggleTheme(){{const b=document.body;b.classList.toggle('dark');localStorage.setItem('theme',b.classList.contains('dark')?'dark':'light')}}
    if(localStorage.getItem('theme')==='dark')document.body.classList.add('dark');
  </script>
</body>
</html>
'''

def generate_index_html(articles_by_category, sync_time, total_count):
    """生成首頁 HTML"""
    sections = []
    nav_items = []

    category_order = [
        ('佛學', 'buddhism'),
        ('思維方法', 'thinking'),
        ('AI技術', 'ai'),
        ('Claude_Code', 'claude'),
        ('遊戲開發', 'game'),
        ('資訊安全', 'security'),
        ('開源生態', 'opensource'),
        ('其他', 'other')
    ]

    for cat_name, cat_slug in category_order:
        articles = articles_by_category.get(cat_name, [])
        if not articles:
            continue

        articles.sort(key=lambda x: x.get('updated', ''), reverse=True)
        display_name = cat_name.replace('_', ' ')
        count = len(articles)
        nav_items.append(f'<a href="#{cat_slug}">{display_name} <span class="nav-count">{count}</span></a>')

        cards = []
        for art in articles:
            tags_html = ''.join(f'<span class="tag">{escape(t)}</span>' for t in (art.get('tags') or [])[:4])
            date_str = art.get('updated', '')
            cards.append(f'''
        <article class="article-card" data-title="{escape(art['title'].lower())}" data-tags="{escape(','.join(art.get('tags') or []).lower())}">
          <span class="category-badge category-{cat_slug}">{display_name}</span>
          <h3><a href="articles/{art['slug']}.html">{escape(art['title'])}</a></h3>
          <div class="card-footer">
            <span class="date">{date_str}</span>
            <div class="tags">{tags_html}</div>
          </div>
        </article>
''')

        sections.append(f'''
    <section class="category-section" id="{cat_slug}">
      <h2>{display_name} <span class="count">({count})</span></h2>
      <div class="article-list">
{"".join(cards)}
      </div>
    </section>
''')

    nav_html = '\n        '.join(nav_items)

    return f'''<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="個人知識庫：佛學、思維方法、AI技術、遊戲開發與 Claude Code 研究">
  <title>知識庫 | Knowledge Base</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <div class="container">
      <a href="/" class="logo">知識庫</a>
      <nav>
        {nav_html}
      </nav>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="切換深色模式">
        <span class="theme-icon">&#9680;</span>
      </button>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <h1>探索知識的邊界</h1>
      <p>彙整佛學智慧、思維方法論、AI 前沿技術與開發實踐</p>
      <div class="stats">
        <span>{total_count} 篇文章</span>
        <span>{len([c for c in articles_by_category if articles_by_category[c]])} 個主題</span>
        <span>最後同步 {sync_time}</span>
      </div>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="搜尋文章標題或標籤..." oninput="filterArticles(this.value)">
      </div>
    </div>
  </section>

  <main class="container">
{"".join(sections)}
  </main>

  <footer>
    <div class="container">
      <p>Powered by RAG Knowledge Base | Last sync: {sync_time}</p>
    </div>
  </footer>

  <script>
    function toggleTheme(){{
      const b=document.body;
      b.classList.toggle('dark');
      localStorage.setItem('theme',b.classList.contains('dark')?'dark':'light');
    }}
    if(localStorage.getItem('theme')==='dark')document.body.classList.add('dark');

    function filterArticles(q){{
      const query=q.toLowerCase().trim();
      const cards=document.querySelectorAll('.article-card');
      const sections=document.querySelectorAll('.category-section');
      cards.forEach(c=>{{
        const t=c.getAttribute('data-title')||'';
        const tags=c.getAttribute('data-tags')||'';
        c.style.display=(t.includes(query)||tags.includes(query))?'':'none';
      }});
      sections.forEach(s=>{{
        const visible=s.querySelectorAll('.article-card[style=""],.article-card:not([style])');
        const hidden=s.querySelectorAll('.article-card[style*="none"]');
        s.style.display=(visible.length>0||hidden.length<s.querySelectorAll('.article-card').length)?'':'none';
      }});
    }}
  </script>
</body>
</html>
'''

def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    os.makedirs(ARTICLES_DIR, exist_ok=True)

    with open(f'{OUTPUT_DIR}/temp_notes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    sync_log_path = f'{OUTPUT_DIR}/sync-log.json'
    if os.path.exists(sync_log_path):
        with open(sync_log_path, 'r', encoding='utf-8') as f:
            sync_log = json.load(f)
    else:
        sync_log = {'synced_notes': [], 'last_sync': None}

    synced_hashes = {n['id']: n.get('hash', '') for n in sync_log.get('synced_notes', [])}

    notes = data.get('notes', [])

    # 篩選相關主題
    filtered_notes = []
    for n in notes:
        title = n.get('title', '')
        if not title:
            continue
        tags = n.get('tags', []) or []
        combined = title + ' ' + ','.join(tags)
        if any(k in combined for k in KEYWORDS):
            filtered_notes.append(n)

    articles_by_category = {}
    synced_notes = []
    new_count = 0
    updated_count = 0
    skipped_count = 0

    for note in filtered_notes:
        note_id = note['id']
        title = note.get('title', 'Untitled')
        tags = note.get('tags', []) or []
        content_text = note.get('contentText', '')

        note_hash = content_hash(title, content_text)
        old_hash = synced_hashes.get(note_id, '')
        need_update = (old_hash != note_hash)

        cat_name, cat_slug = categorize(title, tags)
        slug = generate_slug(title, note_id)

        if need_update:
            html_content = generate_article_html(note, cat_name, cat_slug)
            html_path = f'{ARTICLES_DIR}/{slug}.html'

            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            if old_hash:
                updated_count += 1
            else:
                new_count += 1
        else:
            skipped_count += 1

        if cat_name not in articles_by_category:
            articles_by_category[cat_name] = []

        articles_by_category[cat_name].append({
            'id': note_id,
            'title': title,
            'slug': slug,
            'tags': tags,
            'updated': note.get('updatedAt', '')[:10]
        })

        synced_notes.append({
            'id': note_id,
            'title': title,
            'slug': slug,
            'category': cat_name,
            'hash': note_hash
        })

    # 生成首頁
    sync_time = datetime.now().strftime('%Y-%m-%d %H:%M')
    total_count = len(synced_notes)
    index_html = generate_index_html(articles_by_category, sync_time, total_count)

    with open(f'{OUTPUT_DIR}/index.html', 'w', encoding='utf-8') as f:
        f.write(index_html)

    # 更新同步記錄
    category_stats = {cat: len(arts) for cat, arts in articles_by_category.items()}

    new_sync_log = {
        'last_sync': datetime.now().isoformat(),
        'synced_notes': synced_notes,
        'stats': {
            'total_articles': total_count,
            'categories': category_stats
        }
    }

    with open(sync_log_path, 'w', encoding='utf-8') as f:
        json.dump(new_sync_log, f, ensure_ascii=False, indent=2)

    # 清理暫存檔
    for f_name in ['temp_notes.json', 'temp_all_notes.json', 'temp_notes_p2.json',
                    'temp_notes_p3.json', 'temp_notes_p4.json', 'temp_notes_p5.json']:
        temp_file = f'{OUTPUT_DIR}/{f_name}'
        if os.path.exists(temp_file):
            os.remove(temp_file)

    print(f"同步完成！")
    print(f"  新增: {new_count} 篇")
    print(f"  更新: {updated_count} 篇")
    print(f"  跳過: {skipped_count} 篇（無變更）")
    print(f"  總計: {total_count} 篇")
    print(f"分類統計:")
    for cat, count in category_stats.items():
        print(f"  {cat}: {count} 篇")

if __name__ == '__main__':
    main()
