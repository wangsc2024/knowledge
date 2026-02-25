import { CATEGORY_ORDER } from '../types'

interface Props {
  activeFilter: string
  categories: Record<string, number>
  onFilter: (slug: string) => void
}

export default function FilterBar({ activeFilter, categories, onFilter }: Props) {
  const available = CATEGORY_ORDER.filter(c => (categories[c.name] ?? 0) > 0)

  return (
    <div className="filter-bar container">
      <button
        className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`}
        onClick={() => onFilter('all')}
      >
        全部
      </button>
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
