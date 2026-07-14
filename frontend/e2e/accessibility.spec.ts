import { expect, test } from '@playwright/test'
import { loginAs, resetDemo } from './helpers'

test.beforeEach(async ({ page }) => resetDemo(page))

test('public routes and workspace expose accessible names', async ({ page }) => {
  for (const route of ['/', '/culture', '/journey', '/shop', '/cart', '/login', '/register']) {
    await test.step(route, async () => {
      await page.goto(route, { waitUntil: 'commit' })
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('img:not([alt])')).toHaveCount(0)

      const unlabelledControls = await page.locator('input, select, textarea').evaluateAll((controls) => controls.filter((control) => {
        const id = control.getAttribute('id')
        return !control.getAttribute('aria-label')
          && !control.getAttribute('aria-labelledby')
          && control.closest('label') === null
          && (id === null || document.querySelector(`label[for="${CSS.escape(id)}"]`) === null)
      }).length)
      expect(unlabelledControls).toBe(0)
    })
  }

  await test.step('admin workspace buttons', async () => {
    await loginAs(page, 'admin_demo')
    await page.goto('/admin/merchants', { waitUntil: 'commit' })

    const unlabelledButtons = await page.locator('button').evaluateAll((buttons) => buttons.filter((button) => {
      return !button.textContent?.trim()
        && !button.getAttribute('aria-label')
        && !button.getAttribute('aria-labelledby')
        && !button.getAttribute('title')
    }).length)
    expect(unlabelledButtons).toBe(0)
  })
})
