export interface ArticleMeta {
  id: string
  title: string
  slug: string
  category: string
  categorySlug: string
  tags: string[]
  updatedAt: string
  excerpt: string
  readingMin: number
  isNew?: boolean
}

export interface ArticleDetail extends ArticleMeta {
  html: string
  headings: Heading[]
  prev?: NavLink
  next?: NavLink
}

export interface Heading {
  level: number
  text: string
  slug: string
}

export interface NavLink {
  slug: string
  title: string
}

export interface KnowledgeIndex {
  articles: ArticleMeta[]
  stats: {
    total: number
    categories: Record<string, number>
    lastSync: string
  }
}

export const CATEGORY_ORDER: { name: string; slug: string }[] = [
  { name: '佛學', slug: 'buddhism' },
  { name: '思維方法', slug: 'thinking' },
  { name: 'AI技術', slug: 'ai' },
  { name: 'Claude Code', slug: 'claude' },
  { name: '遊戲開發', slug: 'game' },
  { name: '資訊安全', slug: 'security' },
  { name: '開源生態', slug: 'opensource' },
  { name: '其他', slug: 'other' },
]

export const CATEGORY_COLOR: Record<string, string> = {
  buddhism: '#c084fc',
  thinking: '#60a5fa',
  ai: '#34d399',
  claude: '#f97316',
  game: '#fb7185',
  security: '#fbbf24',
  opensource: '#2dd4bf',
  other: '#94a3b8',
}
