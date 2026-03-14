const STORAGE_KEY = 'kb-search-history'
const MAX_ITEMS = 8

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addSearchHistory(query: string): void {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return
  const history = getSearchHistory().filter(h => h !== trimmed)
  history.unshift(trimmed)
  if (history.length > MAX_ITEMS) history.length = MAX_ITEMS
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch { /* quota exceeded */ }
}

export function clearSearchHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
