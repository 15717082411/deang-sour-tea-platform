import { expect, test } from '@playwright/test'
import { loginAs, resetDemo } from './helpers'

test('admin reviews merchants and products, publishes content, and verifies a booking', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  await resetDemo(page)
  await loginAs(page, 'admin_demo')

  await page.goto('/admin/merchants', { waitUntil: 'commit' })
  const pendingMerchant = page.locator('.admin-review-item').filter({ hasText: '山野酸茶小铺' })
  await pendingMerchant.getByRole('button', { name: '审核资料' }).click()
  await page.getByTestId('review-approve').click()
  await expect(page.locator('.workspace-alert--success')).toContainText('商家申请已通过')

  await page.goto('/admin/products', { waitUntil: 'commit' })
  const pendingProduct = page.locator('.admin-product-item').filter({ hasText: '茶魂守护人纪念币' })
  await pendingProduct.getByRole('button', { name: '审核商品' }).click()
  await page.getByTestId('review-approve').click()
  await expect(page.locator('.workspace-alert--success')).toContainText('商品审核已通过')

  await page.goto('/admin/contents', { waitUntil: 'commit' })
  await page.getByRole('button', { name: '新建内容' }).click()
  const editor = page.getByRole('dialog', { name: '新建酸茶内容' })
  await editor.getByLabel('标题').first().fill('答辩现场的酸茶资料')
  await editor.getByLabel('访问路径').fill('defense-sour-tea-note')
  await editor.getByLabel('分类').fill('酸茶科普')
  await editor.getByLabel('封面地址').fill('/images/hero-sour-tea.webp')
  await editor.getByLabel('摘要').fill('用于验证内容发布闭环的摘要。')
  await editor.getByLabel('正文').fill('这是一条包含明确来源元数据的德昂族酸茶答辩演示内容。')
  const source = editor.locator('fieldset').first()
  await source.getByLabel('标题').fill('德昂族酸茶制作技艺')
  await source.getByLabel('发布机构').fill('中国非物质文化遗产网')
  await source.getByLabel('网址').fill('https://www.ihchina.cn/')
  await source.getByLabel('支持内容').fill('支持德昂族酸茶非遗项目相关事实。')
  await editor.getByRole('button', { name: '保存并发布' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('内容已保存并发布')

  await page.goto('/admin/bookings', { waitUntil: 'commit' })
  const pendingRow = page.locator('tbody tr').filter({ hasText: '待核销' }).first()
  const code = (await pendingRow.locator('code').textContent())?.trim() ?? ''
  await page.getByLabel('预约核销码').fill(code)
  await page.getByRole('button', { name: '确认核销' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('核销成功')
})
