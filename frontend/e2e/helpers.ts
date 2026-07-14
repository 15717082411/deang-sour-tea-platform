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
