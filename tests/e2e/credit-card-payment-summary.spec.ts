import { test, expect } from '@playwright/test'

/**
 * Account Intelligence's consolidated "Credit Card Payments" summary
 * (Total/Minimum Amount Due, Next Due Date, due-date insights) — new in this
 * change. `tests/e2e/accounts.spec.ts` and `credit-cards.spec.ts` predate the
 * Account Intelligence merge and target a page structure that no longer
 * exists (see their own stale "Financial Accounts"/"Credit Cards" heading
 * assertions); this spec targets the CURRENT `/credit-cards` page instead of
 * extending those.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/credit-cards')
  await expect(page.getByRole('heading', { name: 'Account Intelligence' })).toBeVisible()
  await expect(page.getByText(/of \d+ accounts/)).toBeVisible()
})

test('Credit Card Payments summary is hidden until the Credit Cards filter is selected', async ({
  page,
}) => {
  await expect(page.getByText('Credit Card Payments', { exact: true })).not.toBeVisible()
  await page.getByRole('button', { name: 'Credit Cards' }).click()
  await expect(page.getByText('Credit Card Payments', { exact: true })).toBeVisible()
})

test('shows consolidated Total/Minimum Amount Due and a Next Due Date', async ({ page }) => {
  await page.getByRole('button', { name: 'Credit Cards' }).click()
  const summary = page.getByText('Credit Card Payments', { exact: true }).locator('..')
  await expect(summary.getByText('Total Amount Due')).toBeVisible()
  await expect(summary.getByText('Minimum Amount Due')).toBeVisible()
  await expect(summary.getByText('Next Due Date')).toBeVisible()
})

test('hides again when switching to Savings/Current/Overdraft', async ({ page }) => {
  await page.getByRole('button', { name: 'Credit Cards' }).click()
  await expect(page.getByText('Credit Card Payments', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Savings' }).click()
  await expect(page.getByText('Credit Card Payments', { exact: true })).not.toBeVisible()
})
