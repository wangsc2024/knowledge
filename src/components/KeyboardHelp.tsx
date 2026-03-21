import { useState, useEffect } from 'react'

const SHORTCUTS = [
  { key: '/', desc: '聚焦搜尋框' },
  { key: 'Esc', desc: '清除搜尋 / 關閉此面板' },
  { key: '← →', desc: '切換上下篇文章（文章頁）' },
  { key: '?', desc: '顯示此快捷鍵說明' },
]

export default function KeyboardHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <div className="kbd-overlay" onClick={() => setOpen(false)}>
      <div className="kbd-dialog" onClick={e => e.stopPropagation()}>
        <div className="kbd-dialog-header">
          <h3>鍵盤快捷鍵</h3>
          <button className="kbd-close" onClick={() => setOpen(false)} aria-label="關閉">✕</button>
        </div>
        <div className="kbd-dialog-body">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="kbd-row">
              <kbd>{s.key}</kbd>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
