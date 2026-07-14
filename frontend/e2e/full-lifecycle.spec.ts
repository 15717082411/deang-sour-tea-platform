import { expect, test } from '@playwright/test'
import { checkoutProduct, formatFutureDate, loginAs, resetDemo } from './helpers'

test('one order and booking complete the full three-role lifecycle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  await resetDemo(page)
  await loginAs(page, 'user_demo')
  const orderId = await checkoutProduct(page, 'product-tasting')
  await page.getByRole('button', { name: '支付成功' }).click()
  await expect(page).toHaveURL(`/account/orders/${orderId}`)
  const orderNo = (await page.locator('.account-page__header .account-eyebrow').textContent())?.trim() ?? ''

  await loginAs(page, 'merchant_demo')
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
  await page.goto('/admin/bookings', { waitUntil: 'commit' })
  await page.getByLabel('预约核销码').fill(bookingCode)
  await page.getByRole('button', { name: '确认核销' }).click()
  await expect(page.locator('.workspace-alert--success')).toContainText('核销成功')

  await loginAs(page, 'user_demo')
  await page.goto(`/account/orders/${orderId}`, { waitUntil: 'commit' })
  const orderTimeline = page.getByRole('list', { name: '订单时间线' })
  for (const label of ['订单已创建', '支付成功', '商家已发货', '用户已收货', '已申请售后']) {
    await expect(orderTimeline.getByText(label, { exact: true })).toHaveCount(1)
  }
  await page.goto('/account/after-sales', { waitUntil: 'commit' })
  const afterSaleRecord = page.locator('.after-sale-row').filter({ has: page.locator(`a[href="/account/orders/${orderId}"]`) })
  for (const label of ['售后申请已提交', '商家开始处理', '售后已通过', '模拟退款完成']) {
    await expect(afterSaleRecord.getByText(label, { exact: true })).toHaveCount(1)
  }
  await page.goto('/account/bookings', { waitUntil: 'commit' })
  await expect(page.locator('.booking-row').filter({ hasText: bookingCode })).toContainText('已核销')
})
