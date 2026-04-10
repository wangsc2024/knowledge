import type { ArticleMeta } from '../types'
import { calcRelevance } from './searchRelevance'

export type ListSortMode = 'recent' | 'reading' | 'title' | 'relevance'

/**
 * 首頁列表排序：「最新」依 updatedAt 降序（不依賴 index.json 的分類插入順序）。
 */
export function sortArticleMetas(
  articles: ArticleMeta[],
  sortMode: ListSortMode,
  searchTokens: string[]
): ArticleMeta[] {
  const results = [...articles]
  if (sortMode === 'relevance' && searchTokens.length > 0) {
    results.sort((a, b) => {
      const scoreA = calcRelevance(a, searchTokens)
      const scoreB = calcRelevance(b, searchTokens)
      if (scoreB !== scoreA) return scoreB - scoreA
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  } else if (sortMode === 'reading') {
    results.sort((a, b) => b.readingMin - a.readingMin)
  } else if (sortMode === 'title') {
    results.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'))
  } else {
    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  return results
}
