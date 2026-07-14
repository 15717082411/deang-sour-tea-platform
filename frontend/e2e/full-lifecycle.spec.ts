import { expect, test } from '@playwright/test'
import { checkoutProduct, formatFutureDate, loginAs, resetDemo } from './helpers'

test('one order and booking complete the full three-role lifecycle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  const reviewProductName = '跨角色审核酸茶体验装'
  await resetDemo(page)
  await loginAs(page, 'user_demo')
  const orderId = await checkoutProduct(page, 'product-tasting')
  await page.getByRole('button', { name: '支付成功' }).click()
  await expect(page).toHaveURL(`/account/orders/${orderId}`)
  const orderNo = (await page.locator('.account-page__header .account-eyebrow').textContent())?.trim() ?? ''

  await loginAs(page, 'merchant_demo')
  await page.goto('/merchant/products/new', { waitUntil: 'commit' })
  await page.getByLabel('商品名称').fill(reviewProductName)
  await page.getByLabel('商品分类').fill('体验装')
  await page.getByLabel('销售价格（元）').fill('79.00')
  await page.getByLabel('库存数量').fill('12')
  await page.getByLabel('商品图片地址').fill('/images/product-tasting.webp')
  await page.getByLabel('商品介绍').fill('用于验证商家提交与管理员审核同一商品的跨角色闭环。')
  await page.getByRole('button', { name: '保存并提交' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('商品已保存并提交审核')

  await page.goto('/merchant/orders', { waitUntil: 'commit' })
  const orderRow = page.locator('tbody tr').filter({ hasText: orderNo })
  await orderRow.getByRole('button', { name: '确认发货' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('订单已标记为发货')

  await loginAs(page, 'user_demo')
  await page.goto(`/account/orders/${orderId}`, { waitUntil: 'commit' })
  await page.getByRole('button', { name: '确认收货' }).click()
  await page.getByLabel('售后原因').fill('完整生命周期演示售后')
  await page.getByRole('button', { name: '提交售后申请' }).click()
  await expect(page.locator('.account-alert--success')).toContainText('售后申请已提交')

  await loginAs(page, 'merchant_demo')
  await page.goto('/merchant/after-sales', { waitUntil: 'commit' })
  const afterSale = page.locator('.merchant-after-sale-item').filter({ hasText: orderNo })
  await afterSale.getByLabel('处理说明').fill('同意完整生命周期演示退款')
  await afterSale.getByRole('button', { name: '通过申请' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('售后已通过')
  page.once('dialog', (dialog) => dialog.accept())
  await afterSale.getByRole('button', { name: '完成模拟退款' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('模拟退款已完成')

  await loginAs(page, 'user_demo')
  await page.goto('/booking', { waitUntil: 'commit' })
  await page.getByLabel('体验日期').fill(formatFutureDate(10))
  await page.getByLabel('体验人数').fill('2')
  await page.getByLabel('联系电话').fill('13800138000')
  await page.getByRole('button', { name: '确认预约' }).click()
  const bookingCode = (await page.getByTestId('booking-code').textContent())?.trim() ?? ''

  await loginAs(page, 'admin_demo')
  await page.goto('/admin/products', { waitUntil: 'commit' })
  const submittedProduct = page.locator('.admin-product-item').filter({ hasText: reviewProductName })
  await expect(submittedProduct).toHaveCount(1)
  await submittedProduct.getByRole('button', { name: '审核商品' }).click()
  await page.getByTestId('review-approve').click()
  await expect(page.locator('.workspace-alert--success')).toContainText('商品审核已通过')
  await page.getByLabel('状态筛选').selectOption('ALL')
  await expect(page.locator('.admin-product-item').filter({ hasText: reviewProductName })).toContainText('已上架')

  await page.goto('/admin/bookings', { waitUntil: 'commit' })
  await page.getByLabel('预约核销码').fill(bookingCode)
  await page.getByRole('button', { name: '确认核销' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('核销成功')

  await loginAs(page, 'user_demo')
  await page.goto(`/account/orders/${orderId}`, { waitUntil: 'commit' })
  const orderTimeline = page.getByRole('list', { name: '订单时间线' })
  await expect(orderTimeline.locator('li strong')).toHaveText([
    '订单已创建', '支付成功', '商家已发货', '用户已收货', '已申请售后',
  ])
  await page.goto('/account/after-sales', { waitUntil: 'commit' })
  const afterSaleRecord = page.locator('.after-sale-row').filter({ has: page.locator(`a[href="/account/orders/${orderId}"]`) })
  await expect(afterSaleRecord.locator('ol li strong')).toHaveText([
    '售后申请已提交', '商家开始处理', '售后已通过', '模拟退款完成',
  ])
  await page.goto('/account/bookings', { waitUntil: 'commit' })
  const bookingRecord = page.locator('.booking-row').filter({ hasText: bookingCode })
  await expect(bookingRecord).toContainText('已核销')
  await expect(bookingRecord.locator('.booking-timeline li strong')).toHaveText(['预约已提交', '预约已核销'])
})
