import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import type { ArticleDetail } from '../types'

function estimateWordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, '')
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const words = (text.match(/[a-zA-Z]+/g) || []).length
  return cjk + words
}

export default function Article() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tocOpen, setTocOpen] = useState(true)
  const [activeHeading, setActiveHeading] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/data/articles/${slug}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`找不到文章 (${r.status})`)
        return r.json() as Promise<ArticleDetail>
      })
      .then(data => {
        setArticle(data)
        setLoading(false)
        window.scrollTo(0, 0)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [slug])

  // Add copy buttons to code blocks
  useEffect(() => {
    if (!article || !contentRef.current) return
    const pres = contentRef.current.querySelectorAll('pre')
    pres.forEach(pre => {
      if (pre.querySelector('.code-copy-btn')) return
      const btn = document.createElement('button')
      btn.className = 'code-copy-btn'
      btn.textContent = '複製'
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')?.textContent || ''
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '已複製'
          btn.classList.add('copied')
          setTimeout(() => {
            btn.textContent = '複製'
            btn.classList.remove('copied')
          }, 2000)
        })
      })
      pre.style.position = 'relative'
      pre.appendChild(btn)
    })
  }, [article])

  // Reading progress + back to top + active heading tracking
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0)
      setShowTop(window.scrollY > 300)

      // Track active heading for TOC highlight
      const headings = document.querySelectorAll('.article-content h2[id], .article-content h3[id]')
      let current = ''
      headings.forEach(el => {
        if (el.getBoundingClientRect().top <= 100) {
          current = el.id
        }
      })
      setActiveHeading(current)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard navigation: left/right to navigate prev/next article
  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (e.key === 'ArrowLeft' && article?.prev) {
      navigate(`/article/${article.prev.slug}`)
    } else if (e.key === 'ArrowRight' && article?.next) {
      navigate(`/article/${article.next.slug}`)
    }
  }, [article, navigate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyNav)
    return () => window.removeEventListener('keydown', handleKeyNav)
  }, [handleKeyNav])

  const handleCopy = () => {
    navigator.clipboard.writeText(location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>載入文章...</p>
      </div>
    )
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <div className="loading">
          <p>⚠️ {error || '文章不存在'}</p>
          <Link to="/" style={{ marginTop: '1rem', color: 'var(--accent)' }}>← 返回首頁</Link>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Reading Progress */}
      <div className="reading-progress" style={{ width: `${progress}%` }} />

      <Header />

      <div className="article-layout">
        {/* Sticky TOC Sidebar (large screens) */}
        {article.headings.length >= 3 && (
          <aside className="toc-sidebar">
            <div className="toc-sidebar-inner">
              <h4>目錄</h4>
              <ol className="toc-list">
                {article.headings.map((h, i) => (
                  <li key={i} className={`${h.level === 3 ? 'toc-h3' : ''}${activeHeading === h.slug ? ' toc-active' : ''}`}>
                    <a href={`#${h.slug}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        )}

        <div className="article-page">
          {/* Article Header */}
          <div className="article-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`cat-badge ${article.categorySlug}`}>{article.category}</span>
            </div>
            <h1>{article.title}</h1>
            <div className="article-meta">
              <span>{article.updatedAt}</span>
              <span>約 {estimateWordCount(article.html).toLocaleString()} 字</span>
              <span>{article.readingMin} 分鐘閱讀</span>
              <button
                className={`copy-btn${copied ? ' copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? '✓ 已複製' : '🔗 複製連結'}
              </button>
            </div>
            {article.tags.length > 0 && (
              <div className="article-tags">
                {article.tags.slice(0, 8).map(t => (
                  <Link key={t} to={`/?q=${encodeURIComponent(t)}`} className="tag clickable">{t}</Link>
                ))}
              </div>
            )}
          </div>

          {/* Inline TOC (mobile) */}
          {article.headings.length >= 3 && (
            <details className="article-toc toc-mobile" open={tocOpen}>
              <summary onClick={e => { e.preventDefault(); setTocOpen(o => !o) }}>
                目錄
              </summary>
              <ol className="toc-list">
                {article.headings.map((h, i) => (
                  <li key={i} className={h.level === 3 ? 'toc-h3' : ''}>
                    <a href={`#${h.slug}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Article Content */}
          <div
            ref={contentRef}
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          {/* Keyboard Navigation Hint */}
          {(article.prev || article.next) && (
            <div className="keyboard-hint">
              ← → 鍵盤切換文章
            </div>
          )}

          {/* Prev/Next Navigation */}
          {(article.prev || article.next) && (
            <nav className="article-nav">
              {article.prev ? (
                <Link to={`/article/${article.prev.slug}`} className="nav-prev">
                  <span className="nav-label">← 上一篇</span>
                  <span className="nav-title">{article.prev.title}</span>
                </Link>
              ) : <div />}
              {article.next ? (
                <Link to={`/article/${article.next.slug}`} className="nav-next">
                  <span className="nav-label">下一篇 →</span>
                  <span className="nav-title">{article.next.title}</span>
                </Link>
              ) : <div />}
            </nav>
          )}

          <Link to="/" className="back-link">← 返回首頁</Link>
        </div>
      </div>

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
          <p>Powered by RAG Knowledge Base</p>
        </div>
      </footer>
    </>
  )
}
