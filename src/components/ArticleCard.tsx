import { Link } from 'react-router-dom'
import type { ArticleMeta } from '../types'

interface Props {
  article: ArticleMeta
  searchQuery: string
  onTagClick?: (tag: string) => void
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  // Support multi-keyword highlighting: split by spaces, highlight each token
  const tokens = query.trim().split(/\s+/).filter(t => t.length > 0)
  if (tokens.length === 0) return text
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    tokens.some(t => part.toLowerCase() === t.toLowerCase())
      ? <mark key={i}>{part}</mark>
      : part
  )
}

export default function ArticleCard({ article, searchQuery, onTagClick }: Props) {
  return (
    <article className="article-card">
      <div className="card-top">
        <span className={`cat-badge ${article.categorySlug}`}>{article.category}</span>
        {article.isNew && <span className="new-badge">NEW</span>}
        <span className="card-time">{article.readingMin} 分鐘</span>
      </div>
      <h3>
        <Link to={`/article/${article.slug}`}>
          {highlight(article.title, searchQuery)}
        </Link>
      </h3>
      {article.excerpt && (
        <p className="card-excerpt">{highlight(article.excerpt, searchQuery)}</p>
      )}
      <div className="card-footer">
        <span className="card-date">{article.updatedAt}</span>
        {article.tags.length > 0 && (
          <div className="card-tags">
            {article.tags.slice(0, 3).map(t => (
              <span
                key={t}
                className={`tag clickable${searchQuery && searchQuery.trim().split(/\s+/).some(token => token.length > 0 && t.toLowerCase().includes(token)) ? ' tag-match' : ''}`}
                onClick={() => onTagClick?.(t)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onTagClick?.(t)}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
