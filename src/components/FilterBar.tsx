import { CATEGORY_ORDER } from '../types'

interface Props {
  activeFilter: string
  categories: Record<string, number>
  newCount?: number
  unreadCount?: number
  onFilter: (slug: string) => void
}

export default function FilterBar({ activeFilter, categories, newCount = 0, unreadCount = 0, onFilter }: Props) {
  const available = CATEGORY_ORDER.filter(c => (categories[c.name] ?? 0) > 0)
  const total = Object.values(categories).reduce((sum, n) => sum + n, 0)

  return (
    <div className="filter-bar" role="toolbar" aria-label="文章分類與狀態篩選">
      <button
        type="button"
        className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`}
        onClick={() => onFilter('all')}
        aria-pressed={activeFilter === 'all'}
      >
        全部 ({total})
      </button>
      {newCount > 0 && (
        <button
          type="button"
          className={`filter-btn filter-btn-new${activeFilter === 'new' ? ' active' : ''}`}
          onClick={() => onFilter('new')}
          aria-pressed={activeFilter === 'new'}
        >
          新增 ({newCount})
        </button>
      )}
      {unreadCount > 0 && (
        <button
          type="button"
          className={`filter-btn filter-btn-unread${activeFilter === 'unread' ? ' active' : ''}`}
          onClick={() => onFilter('unread')}
          aria-pressed={activeFilter === 'unread'}
        >
          未讀 ({unreadCount})
        </button>
      )}
      {available.map(cat => (
        <button
          type="button"
          key={cat.slug}
          className={`filter-btn${activeFilter === cat.slug ? ' active' : ''}`}
          onClick={() => onFilter(cat.slug)}
          aria-pressed={activeFilter === cat.slug}
        >
          {cat.name} ({categories[cat.name]})
        </button>
      ))}
    </div>
  )
}
