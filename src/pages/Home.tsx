import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CategoryChart from '../components/CategoryChart'
import FilterBar from '../components/FilterBar'
import ArticleCard from '../components/ArticleCard'
import type { KnowledgeIndex, ArticleMeta } from '../types'
import { CATEGORY_ORDER } from '../types'

const INITIAL_SHOW = 12
type SortMode = 'recent' | 'reading' | 'title' | 'relevance'

/** Split search query into tokens, supporting multi-keyword search */
function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0)
}

/** Calculate search relevance score for an article against query tokens */
function calcRelevance(article: ArticleMeta, tokens: string[]): number {
  if (tokens.length === 0) return 0
  let score = 0
  const titleLower = article.title.toLowerCase()
  const excerptLower = article.excerpt.toLowerCase()
  const tagsLower = article.tags.map(t => t.toLowerCase())
  const categoryLower = article.category.toLowerCase()

  for (const token of tokens) {
    // Title match (highest weight)
    if (titleLower.includes(token)) {
      score += 10
      if (titleLower.startsWith(token)) score += 5
    }
    // Tag exact match (high weight)
    if (tagsLower.some(t => t === token)) {
      score += 8
    } else if (tagsLower.some(t => t.includes(token))) {
      score += 4
    }
    // Category match
    if (categoryLower.includes(token)) score += 3
    // Excerpt match (lowest weight)
    if (excerptLower.includes(token)) score += 2
  }
  return score
}

/** Check if an article matches ALL tokens (AND logic) */
function matchesAllTokens(article: ArticleMeta, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every(token =>
    article.title.toLowerCase().includes(token)
    || article.category.toLowerCase().includes(token)
    || article.tags.some(t => t.toLowerCase().includes(token))
    || article.excerpt.toLowerCase().includes(token)
  )
}

const CATEGORY_DESC: Record<string, string> = {
  buddhism: '楞嚴經、法華經、淨土宗、教觀綱宗等經典研究與修行方法',
  thinking: '費曼技巧、批判思考、決策框架與結構化分析方法論',
  ai: 'LLM、RAG、Agent 架構、深度學習與 AI 應用前沿技術',
  claude: 'Claude Code 工具鏈、Hooks、Skills 與自動化開發實踐',
  game: 'HTML5 遊戲、Canvas 渲染、遊戲設計模式與互動體驗',
  security: '資通安全、滲透測試、漏洞分析與防護策略',
  opensource: 'GitHub 熱門專案、開源生態趨勢與技術選型',
  other: '跨領域知識與未分類研究',
}

export default function Home() {
  const [index, setIndex] = useState<KnowledgeIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showCounts, setShowCounts] = useState<Record<string, number>>({})
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // Track previous sort mode before search auto-switches to relevance
  const prevSortRef = useRef<SortMode>('recent')

  // Initialize search from URL query param
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setSearchQuery(q.toLowerCase())
      if (searchRef.current) searchRef.current.value = q
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/data/index.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<KnowledgeIndex>
      })
      .then(data => {
        setIndex(data)
        const counts: Record<string, number> = {}
        CATEGORY_ORDER.forEach(c => { counts[c.slug] = INITIAL_SHOW })
        setShowCounts(counts)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && searchRef.current === document.activeElement) {
        setSearchQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Back to top
  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = q.toLowerCase().trim()
      // Auto-switch to relevance sort when search begins, restore when cleared
      if (trimmed && !searchQuery) {
        prevSortRef.current = sortMode
        setSortMode('relevance')
      } else if (!trimmed && searchQuery) {
        setSortMode(prevSortRef.current)
      }
      setSearchQuery(trimmed)
    }, 250)
  }, [searchQuery, sortMode])

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag.toLowerCase())
    if (searchRef.current) searchRef.current.value = tag
    prevSortRef.current = sortMode
    setSortMode('relevance')
  }, [sortMode])

  const handleRandomArticle = useCallback(() => {
    if (!index || index.articles.length === 0) return
    const articles = index.articles
    const randomIdx = Math.floor(Math.random() * articles.length)
    navigate(`/article/${articles[randomIdx].slug}`)
  }, [index, navigate])

  // Tokenize search query for multi-keyword support
  const searchTokens = useMemo(() => tokenizeQuery(searchQuery), [searchQuery])

  const filtered = useMemo(() => {
    if (!index) return []
    const results = index.articles.filter(a => {
      const catMatch = activeFilter === 'all' || a.categorySlug === activeFilter
      if (!catMatch) return false
      if (searchTokens.length === 0) return true
      return matchesAllTokens(a, searchTokens)
    })
    if (sortMode === 'relevance' && searchTokens.length > 0) {
      // Sort by relevance score descending, then by date as tiebreaker
      results.sort((a, b) => {
        const scoreA = calcRelevance(a, searchTokens)
        const scoreB = calcRelevance(b, searchTokens)
        if (scoreB !== scoreA) return scoreB - scoreA
        return b.updatedAt.localeCompare(a.updatedAt)
      })
    } else if (sortMode === 'reading') {
      results.sort((a, b) => b.readingMin - a.readingMin)
    } else if (sortMode === 'title') {
      results.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'))
    }
    return results
  }, [index, searchTokens, activeFilter, sortMode])

  const groupedFiltered = useMemo(() => {
    const groups: Record<string, ArticleMeta[]> = {}
    filtered.forEach(a => {
      if (!groups[a.category]) groups[a.category] = []
      groups[a.category].push(a)
    })
    return groups
  }, [filtered])

  const categoryCounts = index?.stats.categories ?? {}
  const total = index?.stats.total ?? 0
  const lastSync = index?.stats.lastSync?.slice(0, 16).replace('T', ' ') ?? ''
  const activeCategories = Object.keys(categoryCounts).length

  const totalReadingHours = useMemo(() => {
    if (!index) return 0
    const mins = index.articles.reduce((sum, a) => sum + (a.readingMin || 0), 0)
    return Math.round(mins / 60)
  }, [index])

  // Recent articles
  const recentArticles = useMemo(() => {
    if (!index) return []
    return [...index.articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
  }, [index])

  // New articles count
  const newArticlesCount = useMemo(() => {
    if (!index) return 0
    return index.articles.filter(a => a.isNew).length
  }, [index])

  // Popular tags for quick search
  const popularTags = useMemo(() => {
    if (!index) return []
    const tagCount: Record<string, number> = {}
    index.articles.forEach(a => {
      a.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
    })
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag)
  }, [index])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>載入知識庫...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading">
        <p>載入失敗：{error}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>請先執行 python sync_knowledge.py 同步資料</p>
      </div>
    )
  }

  return (
    <>
      <Header categoryCounts={categoryCounts} />

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>探索知識的邊界</h1>
          <p>彙整佛學智慧、思維方法論、AI 前沿技術與開發實踐</p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{total}</span>
              <span className="hero-stat-label">篇文章</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{activeCategories}</span>
              <span className="hero-stat-label">個主題</span>
            </div>
            {totalReadingHours > 0 && (
              <div className="hero-stat">
                <span className="hero-stat-value">{totalReadingHours}h+</span>
                <span className="hero-stat-label">閱讀時數</span>
              </div>
            )}
            <div className="hero-stat">
              <span className="hero-stat-value">{lastSync}</span>
              <span className="hero-stat-label">最後同步</span>
            </div>
          </div>
          <div className="search-wrap">
            <input
              ref={searchRef}
              type="text"
              placeholder={`搜尋 ${total} 篇文章... (支援多關鍵字，空格分隔)`}
              onChange={e => handleSearch(e.target.value)}
              aria-label="搜尋"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => {
                  setSearchQuery('')
                  setSortMode(prevSortRef.current)
                  if (searchRef.current) {
                    searchRef.current.value = ''
                    searchRef.current.focus()
                  }
                }}
                aria-label="清除搜尋"
              >
                ✕
              </button>
            )}
            <span className="search-kbd">{searchQuery ? '' : '/'}</span>
          </div>
          {searchQuery && searchTokens.length > 1 && (
            <div className="search-tokens">
              {searchTokens.map((token, i) => (
                <span key={i} className="search-token">{token}</span>
              ))}
            </div>
          )}
          {!searchQuery && popularTags.length > 0 && (
            <div className="quick-tags">
              <span className="quick-tags-label">熱門：</span>
              {popularTags.map(tag => (
                <button
                  key={tag}
                  className="quick-tag-btn"
                  onClick={() => {
                    setSearchQuery(tag.toLowerCase())
                    if (searchRef.current) searchRef.current.value = tag
                    prevSortRef.current = sortMode
                    setSortMode('relevance')
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <button className="random-btn" onClick={handleRandomArticle}>
            隨機探索一篇文章
          </button>
          {searchQuery && (
            <div className="search-stats">
              <span>{filtered.length} 篇符合</span>
              {Object.entries(groupedFiltered)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([cat, arts]) => {
                  const catInfo = CATEGORY_ORDER.find(c => c.name === cat)
                  return (
                    <button
                      key={cat}
                      className="search-stat-chip"
                      onClick={() => catInfo && setActiveFilter(catInfo.slug)}
                    >
                      {cat} {arts.length}
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      </section>

      {/* Chart */}
      <CategoryChart categories={categoryCounts} />

      {/* Filter Bar */}
      <div className="filter-sort-row container">
        <FilterBar
          activeFilter={activeFilter}
          categories={categoryCounts}
          onFilter={slug => {
            setActiveFilter(slug)
            setSearchQuery('')
            if (searchRef.current) searchRef.current.value = ''
          }}
        />
        <div className="sort-group">
          <span className="sort-label">排序</span>
          {([
            ['recent', '最新'],
            ['relevance', '相關度'],
            ['reading', '閱讀量'],
            ['title', '標題'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`sort-btn${sortMode === key ? ' active' : ''}${key === 'relevance' && !searchQuery ? ' sort-btn-disabled' : ''}`}
              onClick={() => {
                if (key === 'relevance' && !searchQuery) return
                setSortMode(key)
              }}
              title={key === 'relevance' && !searchQuery ? '輸入搜尋關鍵字後可用相關度排序' : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container articles-main">
        {/* Recent (only when no filter/search) */}
        {activeFilter === 'all' && !searchQuery && (
          <section className="recent-section">
            <h2>
              最近更新
              {newArticlesCount > 0 && (
                <span className="new-count-badge">+{newArticlesCount} 新增</span>
              )}
            </h2>
            <div className="recent-grid">
              {recentArticles.map(a => (
                <div key={a.id} className="recent-card">
                  <h4>
                    <Link to={`/article/${a.slug}`}>{a.title}</Link>
                    {a.isNew && <span className="new-badge" style={{ marginLeft: '0.4rem' }}>NEW</span>}
                  </h4>
                  {a.excerpt && <p className="recent-card-excerpt">{a.excerpt}</p>}
                  <div className="recent-card-meta">
                    <span className={`cat-badge ${a.categorySlug}`}>{a.category}</span>
                    <span className="card-date">{a.updatedAt}</span>
                    <span className="card-time">{a.readingMin} 分鐘</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Relevance-sorted flat list when searching */}
        {searchQuery && sortMode === 'relevance' ? (
          <section className="relevance-results">
            <h2 className="relevance-header">
              搜尋結果
              <span className="relevance-hint">依相關度排序</span>
            </h2>
            <div className="article-grid">
              {filtered.slice(0, showCounts['__relevance'] ?? INITIAL_SHOW * 2).map(a => (
                <ArticleCard key={a.id} article={a} searchQuery={searchQuery} onTagClick={handleTagClick} />
              ))}
            </div>
            {filtered.length > (showCounts['__relevance'] ?? INITIAL_SHOW * 2) && (
              <button
                className="load-more-btn"
                onClick={() => setShowCounts(prev => ({
                  ...prev,
                  __relevance: (prev['__relevance'] ?? INITIAL_SHOW * 2) + 24
                }))}
              >
                載入更多 ({filtered.length - (showCounts['__relevance'] ?? INITIAL_SHOW * 2)} 篇)
              </button>
            )}
          </section>
        ) : (
          /* Category Sections */
          CATEGORY_ORDER.map(cat => {
            const articles = groupedFiltered[cat.name]
            if (!articles || articles.length === 0) return null
            const shown = showCounts[cat.slug] ?? INITIAL_SHOW
            const visible = articles.slice(0, shown)
            const remaining = articles.length - shown

            return (
              <section key={cat.slug} className="category-section" id={cat.slug}>
                <div
                  className="category-header"
                  onClick={() => {
                    const el = document.getElementById(cat.slug)
                    el?.classList.toggle('collapsed')
                  }}
                >
                  <div className="category-header-text">
                    <h2>{cat.name}</h2>
                    {CATEGORY_DESC[cat.slug] && (
                      <span className="category-desc">{CATEGORY_DESC[cat.slug]}</span>
                    )}
                  </div>
                  <span className="cat-count">{articles.length} 篇</span>
                  <span className="cat-toggle">▼</span>
                </div>
                <div className="article-grid">
                  {visible.map(a => (
                    <ArticleCard key={a.id} article={a} searchQuery={searchQuery} onTagClick={handleTagClick} />
                  ))}
                </div>
                {remaining > 0 && (
                  <button
                    className="load-more-btn"
                    onClick={() => setShowCounts(prev => ({
                      ...prev,
                      [cat.slug]: (prev[cat.slug] ?? INITIAL_SHOW) + 12
                    }))}
                  >
                    載入更多 ({remaining} 篇)
                  </button>
                )}
              </section>
            )
          })
        )}

        {filtered.length === 0 && searchQuery && (
          <div className="empty-state">
            <p>找不到符合「{searchQuery}」的文章</p>
            <p style={{ fontSize: '0.875rem' }}>
              {searchTokens.length > 1
                ? '多關鍵字使用 AND 邏輯，試試減少關鍵字或使用更寬泛的詞彙'
                : '試試其他關鍵字或切換分類'
              }
            </p>
          </div>
        )}
      </main>

      {/* Back to Top */}
      <button
        className={`back-to-top${showTop ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="回到頂部"
      >
        ↑
      </button>

      <footer>
        <div className="container">
          <p>{total} 篇文章 · {activeCategories} 個分類 · {totalReadingHours}h+ 閱讀量 · 最後同步 {lastSync}</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>Powered by RAG Knowledge Base</p>
        </div>
      </footer>
    </>
  )
}
