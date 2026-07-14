import { expect, test } from '@playwright/test'
import { checkoutProduct, formatFutureDate, loginAs, resetDemo } from './helpers'

test('a new user completes journey, payment recovery, and booking', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  await resetDemo(page)
  await page.goto('/register', { waitUntil: 'commit' })
  await page.getByLabel('用户名').fill('defense_user')
  await page.getByLabel('密码').fill('Defense123!')
  await page.getByLabel('手机号').fill('13900139000')
  await page.getByRole('button', { name: '注册', exact: true }).click()
  await expect(page).toHaveURL(/\/account$/)

  await page.goto('/journey', { waitUntil: 'commit' })
  for (let step = 0; step < 3; step += 1) {
    await page.locator('input[type="radio"]').first().check()
    await page.getByTestId('journey-next').click()
  }
  await page.getByTestId('save-poster').click()
  await expect(page.locator('.journey-save-success')).toContainText('配方海报保存成功')

  const orderId = await checkoutProduct(page)
  await page.getByRole('button', { name: '支付失败' }).click()
  await expect(page.locator('.commerce-feedback[role="status"]')).toContainText('订单仍为待支付')
  await page.getByRole('button', { name: '支付成功' }).click()
  await expect(page).toHaveURL(`/account/orders/${orderId}`)
  await expect(page.getByText('待发货', { exact: true })).toBeVisible()

  await page.goto('/booking', { waitUntil: 'commit' })
  await page.getByLabel('体验日期').fill(formatFutureDate())
  await page.getByLabel('体验人数').fill('3')
  await page.getByLabel('联系电话').fill('13900139000')
  await page.getByLabel('配方海报').selectOption({ index: 1 })
  await page.getByRole('button', { name: '确认预约' }).click()
  await expect(page.getByTestId('booking-success')).toBeVisible()
  await expect(page.getByTestId('booking-code')).toContainText('BOOK-')
})

test('the seeded user receives a shipped order and opens after-sales', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'business lifecycle runs once')
  await resetDemo(page)
  await loginAs(page, 'user_demo')
  await page.goto('/account/orders', { waitUntil: 'commit' })
  const shipped = page.locator('.order-row').filter({ hasText: '待收货' }).first()
  await shipped.getByRole('link').click()
  await page.getByRole('button', { name: '确认收货' }).click()
  await expect(page.locator('.account-alert--success')).toContainText('已确认收货')
  await page.getByLabel('售后原因').fill('答辩演示：商品包装破损')
  await page.getByRole('button', { name: '提交售后申请' }).click()
  await expect(page.locator('.account-alert--success')).toContainText('售后申请已提交')
})
