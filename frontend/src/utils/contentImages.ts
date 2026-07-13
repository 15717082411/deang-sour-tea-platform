import type { ContentArticle } from '../domain/types'

export const CRAFT_FERMENTATION_ALT = '双手将茶叶压入敞口竹筒，旁有捆扎好的竹筒，项目原创视觉'

export function getContentCoverAlt(article: Pick<ContentArticle, 'cover' | 'title'>): string {
  return article.cover === '/images/craft-fermentation.webp'
    ? CRAFT_FERMENTATION_ALT
    : `${article.title}主题视觉，项目原创视觉`
}
