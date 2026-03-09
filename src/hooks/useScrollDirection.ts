import { useState, useEffect, useRef } from 'react'

/** Returns 'up' | 'down'; header should hide on 'down', show on 'up' */
export function useScrollDirection(threshold = 10): 'up' | 'down' {
  const [dir, setDir] = useState<'up' | 'down'>('up')
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - lastY.current) >= threshold) {
          setDir(y > lastY.current && y > 60 ? 'down' : 'up')
          lastY.current = y
        }
        ticking.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return dir
}
