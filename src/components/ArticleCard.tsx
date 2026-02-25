import { Link } from 'react-router-dom'
import type { ArticleMeta } from '../types'

interface Props {
  article: ArticleMeta
  searchQuery: string
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : part
  )
}

export default function ArticleCard({ article, searchQuery }: Props) {
  return (
    <article className="article-card">
      <div className="card-top">
        <span className={`cat-badge ${article.categorySlug}`}>{article.category}</span>
        {article.isNew && <span className="new-badge">NEW</span>}
      </div>
      <h3>
        <Link to={`/article/${article.slug}`}>
          {highlight(article.title, searchQuery)}
        </Link>
      </h3>
      {article.excerpt && (
        <p className="card-excerpt">{article.excerpt}</p>
      )}
      <div className="card-footer">
        <span className="card-date">{article.updatedAt}</span>
        <span className="card-time">{article.readingMin} 分鐘</span>
        {article.tags.length > 0 && (
          <div className="card-tags">
            {article.tags.slice(0, 3).map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
