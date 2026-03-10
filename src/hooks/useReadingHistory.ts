const STORAGE_KEY = 'kb-reading-history'
const MAX_ENTRIES = 50

export interface ReadingRecord {
  slug: string
  title: string
  category: string
  categorySlug: string
  readAt: string   // ISO timestamp
}

function load(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(records: ReadingRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_ENTRIES)))
}

/** Record an article as read. Deduplicates by slug, keeps most recent first. */
export function recordRead(slug: string, title: string, category: string, categorySlug: string) {
  const records = load().filter(r => r.slug !== slug)
  records.unshift({ slug, title, category, categorySlug, readAt: new Date().toISOString() })
  save(records)
}

/** Get reading history (most recent first). */
export function getReadingHistory(limit = 8): ReadingRecord[] {
  return load().slice(0, limit)
}

/** Get set of all read slugs (for efficient batch checking). */
export function getReadSlugs(): Set<string> {
  return new Set(load().map(r => r.slug))
}
