import { describe, it, expect } from 'vitest'
import { sortArticleMetas } from './articleListSort'
import type { ArticleMeta } from '../types'

const art = (over: Partial<ArticleMeta> & Pick<ArticleMeta, 'id' | 'slug'>): ArticleMeta => ({
  id: over.id,
  title: over.title ?? 'T',
  slug: over.slug,
  category: '其他',
  categorySlug: 'other',
  tags: over.tags ?? [],
  updatedAt: over.updatedAt ?? '2026-01-01',
  excerpt: over.excerpt ?? '',
  readingMin: over.readingMin ?? 5,
})

describe('sortArticleMetas', () => {
  it('recent 依 updatedAt 降序', () => {
    const a = art({ id: '1', slug: 'a', updatedAt: '2026-01-01' })
    const b = art({ id: '2', slug: 'b', updatedAt: '2026-06-01' })
    expect(sortArticleMetas([a, b], 'recent', [])).toEqual([b, a])
  })

  it('reading 依閱讀分鐘數降序', () => {
    const a = art({ id: '1', slug: 'a', readingMin: 3 })
    const b = art({ id: '2', slug: 'b', readingMin: 10 })
    expect(sortArticleMetas([a, b], 'reading', [])).toEqual([b, a])
  })

  it('title 與 localeCompare(zh-Hant) 一致', () => {
    const a = art({ id: '1', slug: 'a', title: '乙' })
    const b = art({ id: '2', slug: 'b', title: '甲' })
    const expected = [a, b].slice().sort((x, y) => x.title.localeCompare(y.title, 'zh-Hant'))
    expect(sortArticleMetas([a, b], 'title', [])).toEqual(expected)
  })

  it('relevance 有搜尋詞時依相關度，同分則較新在前', () => {
    const oldTitle = art({
      id: '1',
      slug: 'old',
      title: '唯獨標題有 magicword',
      excerpt: '摘要',
      updatedAt: '2025-01-01',
    })
    const newTitle = art({
      id: '2',
      slug: 'new',
      title: '唯獨標題有 magicword',
      excerpt: '摘要',
      updatedAt: '2026-01-01',
    })
    const tokens = ['magicword']
    const sorted = sortArticleMetas([oldTitle, newTitle], 'relevance', tokens)
    expect(sorted[0].slug).toBe('new')
  })
})
