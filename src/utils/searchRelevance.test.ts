import { describe, it, expect } from 'vitest'
import { tokenizeQuery, calcRelevance, matchesAllTokens } from './searchRelevance'
import type { ArticleMeta } from '../types'

const baseArticle = (): ArticleMeta => ({
  id: '1',
  title: 'RAG 與 LangChain 實務',
  slug: 'rag-langchain',
  category: 'AI技術',
  categorySlug: 'ai',
  tags: ['RAG', 'Python'],
  updatedAt: '2026-01-01',
  excerpt: '向量檢索與 Agent 設計',
  readingMin: 5,
})

describe('searchRelevance', () => {
  it('tokenizeQuery 支援多空格與 trim', () => {
    expect(tokenizeQuery('  foo   bar  ')).toEqual(['foo', 'bar'])
    expect(tokenizeQuery('')).toEqual([])
  })

  it('matchesAllTokens 為 AND 邏輯', () => {
    const a = baseArticle()
    expect(matchesAllTokens(a, ['rag', 'python'])).toBe(true)
    expect(matchesAllTokens(a, ['rag', 'nope'])).toBe(false)
  })

  it('calcRelevance 標題命中權重高於摘要', () => {
    const titleHit: ArticleMeta = {
      ...baseArticle(),
      title: '唯獨標題有 magicword',
      excerpt: '摘要沒有',
    }
    const excerptHit: ArticleMeta = {
      ...baseArticle(),
      title: '標題沒有',
      excerpt: '摘要才有 magicword',
    }
    expect(calcRelevance(titleHit, ['magicword'])).toBeGreaterThan(calcRelevance(excerptHit, ['magicword']))
  })
})
