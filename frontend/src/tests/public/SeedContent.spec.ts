import { createSeedData } from '../../data/seed'

describe('public culture seed content', () => {
  it('records every required authoritative source with direct URLs and supported claims', () => {
    const sources = createSeedData().contents.flatMap((article) => article.sources)
    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: '德昂族酸茶制作技艺',
        publisher: '中国非物质文化遗产网·中国非物质文化遗产数字博物馆',
        url: 'https://www.ihchina.cn/project_details/23582/',
      }),
      expect.objectContaining({
        title: '德昂族酸茶制作技艺',
        publisher: '云南省农业农村厅',
        url: 'https://nync.yn.gov.cn/html/2025/yzycfycj_0407/1418142.html',
      }),
      expect.objectContaining({
        title: 'Traditional tea processing techniques and associated social practices in China',
        publisher: 'UNESCO Intangible Cultural Heritage',
        url: 'https://ich.unesco.org/en/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884?RL=01884',
      }),
      expect.objectContaining({
        title: '德宏州德昂酸茶高质量发展三年行动计划（2025—2027年）',
        publisher: '德宏州人民政府办公室',
        url: 'https://www.dh.gov.cn/Web/_F0_0_67EWL4TR8A9F3B4052C940E6BE.htm',
      }),
    ]))
    for (const source of sources) expect(source.claim.trim()).not.toBe('')
  })

  it('does not present 45 days as a culture fact and explains documented fermentation variants', () => {
    const cultureCopy = createSeedData().contents
      .map(({ title, summary, body }) => `${title}${summary}${body}`)
      .join('')

    expect(cultureCopy).not.toContain('45天')
    expect(cultureCopy).toContain('50—70天')
    expect(cultureCopy).toContain('约2个月')
    expect(cultureCopy).toContain('更长')
  })

  it('uses prepared WebP assets for article covers and the two approved products', () => {
    const seed = createSeedData()
    expect(seed.contents.every(({ cover }) => cover.endsWith('.webp'))).toBe(true)
    expect(seed.products.find(({ id }) => id === 'product-tasting')?.image).toBe('/images/product-tasting.webp')
    expect(seed.products.find(({ id }) => id === 'product-gift')?.image).toBe('/images/product-gift.webp')
  })

  it('uses only shipped images for every built-in product', () => {
    const shippedProductImages = [
      '/images/product-tasting.webp',
      '/images/product-gift.webp',
    ]

    for (const product of createSeedData().products) {
      expect(shippedProductImages, `${product.id} references an unshipped image`).toContain(product.image)
    }
  })

})
