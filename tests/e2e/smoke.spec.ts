import { test, expect } from '@playwright/test'

test('app shell boots', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/bootstrap complete/i)).toBeVisible()
})
