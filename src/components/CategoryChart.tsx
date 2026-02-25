import { CATEGORY_ORDER, CATEGORY_COLOR } from '../types'

interface Props {
  categories: Record<string, number>
}

export default function CategoryChart({ categories }: Props) {
  const items = CATEGORY_ORDER
    .filter(c => (categories[c.name] ?? 0) > 0)
    .map(c => ({ ...c, count: categories[c.name] ?? 0 }))

  if (items.length === 0) return null

  const max = Math.max(...items.map(i => i.count), 1)

  return (
    <div className="chart-section container">
      <h2>知識分佈</h2>
      <div className="chart-rows">
        {items.map(item => (
          <div key={item.slug} className="chart-row">
            <span className="chart-label">{item.name}</span>
            <div className="chart-bar-bg">
              <div
                className="chart-bar-fill"
                style={{
                  width: `${Math.round(item.count / max * 100)}%`,
                  background: CATEGORY_COLOR[item.slug] ?? 'var(--accent)',
                }}
              />
            </div>
            <span className="chart-count">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
