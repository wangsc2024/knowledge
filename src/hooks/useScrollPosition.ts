import { markComplete } from './useReadComplete'

const STORAGE_KEY = 'kb-scroll-positions'
const MAX_ENTRIES = 30

interface ScrollRecord {
  slug: string
  position: number  // scroll percentage (0-100)
  timestamp: string
}

function load(): ScrollRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(records: ScrollRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_ENTRIES)))
}

/** Save scroll position for an article (as percentage). */
export function saveScrollPosition(slug: string, scrollY: number) {
  const h = document.documentElement.scrollHeight - window.innerHeight
  if (h <= 0) return
  const pct = Math.round((scrollY / h) * 100)
  // Don't save if at top or fully read (>95%)
  if (pct < 5 || pct > 95) {
    // Remove entry if exists
    const records = load().filter(r => r.slug !== slug)
    save(records)
    if (pct > 95) markComplete(slug)
    return
  }
  const records = load().filter(r => r.slug !== slug)
  records.unshift({ slug, position: pct, timestamp: new Date().toISOString() })
  save(records)
}

/** Get saved scroll position for an article. Returns percentage or null. */
export function getSavedPosition(slug: string): number | null {
  const record = load().find(r => r.slug === slug)
  return record ? record.position : null
}

/** Get all saved positions as a slug→percentage map. */
export function getAllPositions(): Record<string, number> {
  const records = load()
  const map: Record<string, number> = {}
  for (const r of records) {
    map[r.slug] = r.position
  }
  return map
}

/** Clear saved position for an article. */
export function clearSavedPosition(slug: string) {
  const records = load().filter(r => r.slug !== slug)
  save(records)
}
