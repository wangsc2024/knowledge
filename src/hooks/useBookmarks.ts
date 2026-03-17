const STORAGE_KEY = 'kb-bookmarks'

export interface Bookmark {
  slug: string
  title: string
  category: string
  categorySlug: string
  savedAt: string
}

function load(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(bookmarks: Bookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
}

export function isBookmarked(slug: string): boolean {
  return load().some(b => b.slug === slug)
}

export function toggleBookmark(slug: string, title: string, category: string, categorySlug: string): boolean {
  const bookmarks = load()
  const idx = bookmarks.findIndex(b => b.slug === slug)
  if (idx >= 0) {
    bookmarks.splice(idx, 1)
    save(bookmarks)
    return false
  }
  bookmarks.unshift({ slug, title, category, categorySlug, savedAt: new Date().toISOString() })
  save(bookmarks)
  return true
}

export function getBookmarks(limit = 50): Bookmark[] {
  return load().slice(0, limit)
}

export function getBookmarkedSlugs(): Set<string> {
  return new Set(load().map(b => b.slug))
}
