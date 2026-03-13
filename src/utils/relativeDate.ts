/** 將日期字串轉為中文相對時間（如「今天」「3天前」「2週前」「1個月前」） */
export function relativeDate(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = now.getTime() - target.getTime()
  if (diffMs < 0) return dateStr

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 14) return '1週前'
  if (days < 30) return `${Math.floor(days / 7)}週前`
  if (days < 60) return '1個月前'
  if (days < 365) return `${Math.floor(days / 30)}個月前`
  return `${Math.floor(days / 365)}年前`
}
