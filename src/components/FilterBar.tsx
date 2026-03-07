import { CATEGORY_ORDER } from '../types'

interface Props {
  activeFilter: string
  categories: Record<string, number>
  newCount?: number
  onFilter: (slug: string) => void
}

export default function FilterBar({ activeFilter, categories, newCount = 0, onFilter }: Props) {
  const available = CATEGORY_ORDER.filter(c => (categories[c.name] ?? 0) > 0)

  return (
    <div className="filter-bar">
      <button
        className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`}
        onClick={() => onFilter('all')}
      >
        全部
      </button>
      {newCount > 0 && (
        <button
          className={`filter-btn filter-btn-new${activeFilter === 'new' ? ' active' : ''}`}
          onClick={() => onFilter('new')}
        >
          新增 ({newCount})
        </button>
      )}
      {available.map(cat => (
        <button
          key={cat.slug}
          className={`filter-btn${activeFilter === cat.slug ? ' active' : ''}`}
          onClick={() => onFilter(cat.slug)}
        >
          {cat.name} ({categories[cat.name]})
        </button>
      ))}
    </div>
  )
}
