import { expect, type Page } from '@playwright/test'

export async function resetDemo(page: Page): Promise<void> {
  await page.route('http://localhost:8080/**', (route) => route.abort('connectionrefused'))
  await page.goto('/', { waitUntil: 'commit' })
}

export async function loginAs(page: Page, username: 'user_demo' | 'merchant_demo' | 'admin_demo'): Promise<void> {
  await page.goto('/login', { waitUntil: 'commit' })
  await page.getByLabel('用户名').fill(username)
  await page.getByLabel('密码').fill('Demo123!')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

export async function expectStablePage(page: Page): Promise<void> {
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('main')).toHaveCount(1)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - globalThis.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

export async function checkoutProduct(page: Page, productId = 'product-tasting'): Promise<string> {
  await page.goto(`/shop/${productId}`, { waitUntil: 'commit' })
  await page.getByRole('button', { name: '立即购买' }).click()
  await expect(page).toHaveURL(/\/checkout\?merchant=/)
  await page.getByLabel('收件人').fill('答辩体验用户')
  await page.getByLabel('手机号').fill('13800138000')
  await page.getByLabel('详细地址').fill('云南省德宏州芒市酸茶体验中心')
  await page.getByRole('button', { name: '创建订单并进入支付' }).click()
  await expect(page).toHaveURL(/\/payment\/[^/]+$/)
  return decodeURIComponent(new URL(page.url()).pathname.split('/').pop() ?? '')
}

export function formatFutureDate(days = 7): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
