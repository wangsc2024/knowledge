import json, re, sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "public" / "data"

BLOCK_PATTERNS = [
    ("(?i)(api[_-]?key|api[_-]?token|secret[_-]?key)\s*[=:]\s*[\w\-]{16,}", "API金鑰"),
    ("(?i)TODOIST_API_TOKEN\s*[=:]", "Todoist Token"),
    ("(?i)(password|passwd)\s*[=:]\s*\S{6,}", "密碼明文"),
    ("ghp_[A-Za-z0-9]{36}", "GitHub PAT"),
]

WARN_PATTERNS = [
    ("localhost:\d{3,5}", "localhost URL"),
    ("[A-Za-z]:[/\\](?:Users|Source)", "本機路徑"),
    ("\.claude[/\\]", ".claude路徑"),
    ("CLAUDE\.md", "CLAUDE.md"),
    ("ntfy\.sh/[A-Za-z0-9_-]{4,}", "ntfy topic"),
    ("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "Email"),
]

TEXT_FIELDS = ["title", "excerpt", "html", "content"]

def scan_text(text, patterns, label):
    hits = []
    for pat, desc in patterns:
        try:
            m = re.findall(pat, text)
            if m:
                hits.append({"field": label, "rule": desc, "sample": str(m[0])[:40], "count": len(m)})
        except re.error:
            pass
    return hits

def scan_file(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return [], []
    b, w = [], []
    for f in TEXT_FIELDS:
        v = data.get(f, "")
        if v and isinstance(v, str):
            b += scan_text(v, BLOCK_PATTERNS, f)
            w += scan_text(v, WARN_PATTERNS, f)
    return b, w

def main():
    sys.stdout.reconfigure(encoding="utf-8")
    verbose = "--verbose" in sys.argv
    if not DATA_DIR.exists():
        print("警告: 資料目錄不存在，跳過審查"); sys.exit(0)
    files = list(DATA_DIR.glob("*.json")) + list((DATA_DIR / "articles").glob("*.json"))
    if not files:
        print("審查通過：無文章"); sys.exit(0)
    print(f"敏感資訊審查：掃描 {len(files)} 個 JSON 檔案...")
    tb, tw, flagged = [], [], []
    for path in sorted(files):
        b, w = scan_file(path)
        if b or w:
            flagged.append((path.name, b, w))
            tb += b; tw += w
    if not tb and not tw:
        print("審查通過：未發現敏感資訊"); sys.exit(0)
    for fname, b, w in flagged:
        print(f"  {fname}")
        for h in b:
            print(f"    BLOCK [{h['field']}] {h['rule']} x{h['count']}")
            if verbose: print(f"      範例：{h['sample']}")
        for h in w:
            print(f"    WARN  [{h['field']}] {h['rule']} x{h['count']}")
            if verbose: print(f"      範例：{h['sample']}")
    print()
    if tb:
        print(f"BLOCK：{len(tb)} 項高風險，禁止推送"); sys.exit(1)
    print(f"WARN：{len(tw)} 項低風險（localhost/本機路徑）"); sys.exit(2)

if __name__ == "__main__":
    main()
