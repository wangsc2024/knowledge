import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CategoryChart from '../components/CategoryChart'
import FilterBar from '../components/FilterBar'
import ArticleCard from '../components/ArticleCard'
import type { KnowledgeIndex, ArticleMeta } from '../types'
import { CATEGORY_ORDER } from '../types'

const INITIAL_SHOW = 12

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
  const [searchParams, setSearchParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

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
    debounceRef.current = setTimeout(() => setSearchQuery(q.toLowerCase().trim()), 150)
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag.toLowerCase())
    if (searchRef.current) searchRef.current.value = tag
  }, [])

  const handleRandomArticle = useCallback(() => {
    if (!index || index.articles.length === 0) return
    const articles = index.articles
    const randomIdx = Math.floor(Math.random() * articles.length)
    navigate(`/article/${articles[randomIdx].slug}`)
  }, [index, navigate])

  const filtered = useMemo(() => {
    if (!index) return []
    return index.articles.filter(a => {
      const catMatch = activeFilter === 'all' || a.categorySlug === activeFilter
      if (!catMatch) return false
      if (!searchQuery) return true
      return a.title.toLowerCase().includes(searchQuery)
        || a.category.toLowerCase().includes(searchQuery)
        || a.tags.some(t => t.toLowerCase().includes(searchQuery))
        || a.excerpt.toLowerCase().includes(searchQuery)
    })
  }, [index, searchQuery, activeFilter])

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
        <p>⚠️ 載入失敗：{error}</p>
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
              placeholder={`搜尋 ${total} 篇文章...`}
              onChange={e => handleSearch(e.target.value)}
              aria-label="搜尋"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => {
                  setSearchQuery('')
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
      <FilterBar
        activeFilter={activeFilter}
        categories={categoryCounts}
        onFilter={slug => {
          setActiveFilter(slug)
          setSearchQuery('')
          if (searchRef.current) searchRef.current.value = ''
        }}
      />

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

        {/* Category Sections */}
        {CATEGORY_ORDER.map(cat => {
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
        })}

        {filtered.length === 0 && searchQuery && (
          <div className="empty-state">
            <p>找不到符合「{searchQuery}」的文章</p>
            <p style={{ fontSize: '0.875rem' }}>試試其他關鍵字或切換分類</p>
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
