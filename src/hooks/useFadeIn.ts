import { useEffect, useRef } from 'react'

/**
 * Observe child elements and add 'fade-in' class when they enter viewport.
 * Attach the returned ref to a parent container element.
 */
export function useFadeIn<T extends HTMLElement>(selector = '.article-card, .recent-card') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px 40px 0px' }
    )

    const targets = el.querySelectorAll(selector)
    targets.forEach((t) => observer.observe(t))

    return () => observer.disconnect()
  })

  return ref
}
