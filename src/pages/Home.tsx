import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import CategoryChart from '../components/CategoryChart'
import FilterBar from '../components/FilterBar'
import ArticleCard from '../components/ArticleCard'
import type { KnowledgeIndex, ArticleMeta } from '../types'
import { CATEGORY_ORDER } from '../types'

const INITIAL_SHOW = 12

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

  // Recent articles
  const recentArticles = useMemo(() => {
    if (!index) return []
    return [...index.articles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
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
            <div className="hero-stat">
              <span className="hero-stat-value">{lastSync}</span>
              <span className="hero-stat-label">最後同步</span>
            </div>
          </div>
          <div className="search-wrap">
            <input
              ref={searchRef}
              type="text"
              placeholder="搜尋文章標題或標籤..."
              onChange={e => handleSearch(e.target.value)}
              aria-label="搜尋"
            />
            <span className="search-kbd">/</span>
          </div>
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
            <h2>最近更新</h2>
            <div className="recent-grid">
              {recentArticles.map(a => (
                <div key={a.id} className="recent-card">
                  <h4>
                    <Link to={`/article/${a.slug}`}>{a.title}</Link>
                    {a.isNew && <span className="new-badge" style={{ marginLeft: '0.4rem' }}>NEW</span>}
                  </h4>
                  <div className="recent-card-meta">
                    <span className={`cat-badge ${a.categorySlug}`}>{a.category}</span>
                    <span className="card-date">{a.updatedAt}</span>
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
                <h2>{cat.name}</h2>
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
          <p>Powered by RAG Knowledge Base | Last sync: {lastSync}</p>
        </div>
      </footer>
    </>
  )
}
