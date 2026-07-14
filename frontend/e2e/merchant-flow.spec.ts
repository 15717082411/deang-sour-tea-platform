import { expect, test } from '@playwright/test'
import { loginAs, resetDemo } from './helpers'

test('merchant submits a product, ships an order, and approves after-sales', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  await resetDemo(page)
  await loginAs(page, 'merchant_demo')
  await page.goto('/merchant/products/new', { waitUntil: 'commit' })
  await page.getByLabel('商品名称').fill('答辩限定酸茶体验装')
  await page.getByLabel('商品分类').fill('体验装')
  await page.getByLabel('销售价格（元）').fill('69.00')
  await page.getByLabel('库存数量').fill('20')
  await page.getByLabel('商品图片地址').fill('/images/product-tasting.webp')
  await page.getByLabel('商品介绍').fill('用于毕业答辩完整交互演示的德昂族酸茶体验装。')
  await page.getByRole('button', { name: '保存并提交' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('商品已保存并提交审核')

  await page.goto('/merchant/orders', { waitUntil: 'commit' })
  await page.getByRole('button', { name: '确认发货' }).first().click()
  await expect(page.locator('.workspace-alert--success')).toContainText('订单已标记为发货')

  await page.goto('/merchant/after-sales', { waitUntil: 'commit' })
  const requested = page.locator('.merchant-after-sale-item').filter({ hasText: '待处理' }).first()
  await requested.getByLabel('处理说明').fill('核验订单和用户凭证后同意处理')
  await requested.getByRole('button', { name: '通过申请' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('售后已通过')
})
