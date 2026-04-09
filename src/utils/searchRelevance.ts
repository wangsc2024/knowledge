import type { ArticleMeta } from '../types'

/** Split search query into tokens, supporting multi-keyword search */
export function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0)
}

/** Calculate search relevance score for an article against query tokens */
export function calcRelevance(article: ArticleMeta, tokens: string[]): number {
  if (tokens.length === 0) return 0
  let score = 0
  const titleLower = article.title.toLowerCase()
  const excerptLower = article.excerpt.toLowerCase()
  const tagsLower = article.tags.map(t => t.toLowerCase())
  const categoryLower = article.category.toLowerCase()

  for (const token of tokens) {
    if (titleLower.includes(token)) {
      score += 10
      if (titleLower.startsWith(token)) score += 5
    }
    if (tagsLower.some(t => t === token)) {
      score += 8
    } else if (tagsLower.some(t => t.includes(token))) {
      score += 4
    }
    if (categoryLower.includes(token)) score += 3
    if (excerptLower.includes(token)) score += 2
  }
  return score
}

/** Check if an article matches ALL tokens (AND logic) */
export function matchesAllTokens(article: ArticleMeta, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every(token =>
    article.title.toLowerCase().includes(token)
    || article.category.toLowerCase().includes(token)
    || article.tags.some(t => t.toLowerCase().includes(token))
    || article.excerpt.toLowerCase().includes(token)
  )
}
