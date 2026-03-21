const STORAGE_KEY = 'kb-read-complete'

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Mark an article as read-complete. */
export function markComplete(slug: string) {
  const data = load()
  if (!data[slug]) {
    data[slug] = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

/** Check if an article is read-complete. */
export function isComplete(slug: string): boolean {
  return slug in load()
}

/** Get all completed slugs as a Set. */
export function getCompleteSlugs(): Set<string> {
  return new Set(Object.keys(load()))
}
