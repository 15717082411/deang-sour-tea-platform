import { expect, test } from '@playwright/test'
import { expectStablePage, loginAs, resetDemo } from './helpers'

const publicRoutes = ['/', '/culture', '/craft', '/stories', '/journey', '/shop', '/cart', '/login', '/register']

test.beforeEach(async ({ page }) => resetDemo(page))

test('public routes and role workspaces remain stable', async ({ page, viewport }) => {
  for (const route of publicRoutes) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'commit' })
      await expectStablePage(page)
    })
  }

  if ((viewport?.width ?? 0) <= 640) {
    await test.step('mobile navigation', async () => {
      await page.goto('/', { waitUntil: 'commit' })
      const widthBefore = await page.evaluate(() => document.documentElement.scrollWidth)
      await page.getByRole('button', { name: '打开导航菜单' }).click()
      await expect(page.getByRole('navigation', { name: '移动主导航' })).toBeVisible()
      await expect(page.getByRole('link', { name: '酸茶商城' }).last()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(widthBefore)
    })
  }

  for (const account of [
    { username: 'user_demo', routes: ['/account/orders', '/account/bookings'] },
    { username: 'merchant_demo', routes: ['/merchant/products'] },
    { username: 'admin_demo', routes: ['/admin/merchants'] },
  ] as const) {
    await test.step(account.username, async () => {
      await loginAs(page, account.username)
      for (const route of account.routes) {
        await page.goto(route, { waitUntil: 'commit' })
        await expectStablePage(page)
      }
    })
  }
})
