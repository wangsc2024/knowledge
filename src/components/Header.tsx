import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { CATEGORY_ORDER } from '../types'

interface Props {
  categoryCounts?: Record<string, number>
}

export default function Header({ categoryCounts = {} }: Props) {
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = CATEGORY_ORDER.filter(c => (categoryCounts[c.name] ?? 0) > 0)

  return (
    <>
      <header>
        <div className="container">
          <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>知識庫</Link>
          <nav>
            {navItems.map(cat => (
              <a
                key={cat.slug}
                href={`/#${cat.slug}`}
                className={location.hash === `#${cat.slug}` ? 'active' : ''}
              >
                {cat.name}
                {categoryCounts[cat.name] > 0 && (
                  <span className="nav-count">{categoryCounts[cat.name]}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button className="theme-btn" onClick={toggle} aria-label="切換深色模式">
              {dark ? '☀️' : '🌙'}
            </button>
            {navItems.length > 0 && (
              <button
                className="menu-btn"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="開啟選單"
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>
      </header>
      {navItems.length > 0 && (
        <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
          {navItems.map(cat => (
            <a
              key={cat.slug}
              href={`/#${cat.slug}`}
              onClick={() => setMenuOpen(false)}
            >
              {cat.name}
              <span className="nav-count">{categoryCounts[cat.name]}</span>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
