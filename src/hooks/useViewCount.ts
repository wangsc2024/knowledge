import { useState, useEffect } from 'react'

const WORKER_URL = 'https://knowledge-view-counter.wsc522.workers.dev'

export function useViewCount(slug: string | undefined) {
  const [views, setViews] = useState<number | null>(null)

  // POST on mount (increment)
  useEffect(() => {
    if (!slug) return
    fetch(`${WORKER_URL}/views/${encodeURIComponent(slug)}`, { method: 'POST' })
      .then(r => r.json())
      .then((data: { views: number }) => setViews(data.views))
      .catch(() => setViews(null))
  }, [slug])

  return views
}

export function useViewCountRead(slug: string | undefined) {
  const [views, setViews] = useState<number | null>(null)

  // GET only (no increment)
  useEffect(() => {
    if (!slug) return
    fetch(`${WORKER_URL}/views/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then((data: { views: number }) => setViews(data.views))
      .catch(() => setViews(null))
  }, [slug])

  return views
}
