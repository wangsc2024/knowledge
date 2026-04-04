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

/** 將 ISO 時間字串轉為精細中文相對時間（分鐘/小時級，適合同步時間顯示） */
export function relativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = now.getTime() - target.getTime()
  if (diffMs < 0) return dateStr.slice(0, 16).replace('T', ' ')

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return dateStr.slice(0, 16).replace('T', ' ')
}
