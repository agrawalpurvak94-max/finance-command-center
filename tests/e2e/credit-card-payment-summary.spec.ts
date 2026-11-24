import { test, expect } from '@playwright/test'

/**
 * Account Intelligence's consolidated "Credit Card Payments" summary
 * (Total/Minimum Amount Due, Next Due Date, upcoming payments list).
 *
 * Account Intelligence UX redesign: this section is now a fixed, always-on
 * part of the page hierarchy (Insights → Portfolio Snapshot → Credit Card
 * Payments → filters → account list) — it no longer hides/reappears behind
 * the "Credit Cards" type filter chip, so "what do I need to pay" stays
 * answerable no matter which account type the list below is filtered to.
 *
 * `tests/e2e/accounts.spec.ts` and `credit-cards.spec.ts` predate the
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

test('Credit Card Payments summary is visible by default, independent of the type filter', async ({
  page,
}) => {
  await expect(page.getByText('Credit Card Payments', { exact: true })).toBeVisible()
})

test('shows consolidated Total/Minimum Amount Due and a Next Due Date', async ({ page }) => {
  const summary = page.getByText('Credit Card Payments', { exact: true }).locator('..')
  await expect(summary.getByText('Total Amount Due')).toBeVisible()
  await expect(summary.getByText('Minimum Amount Due')).toBeVisible()
  await expect(summary.getByText('Next Due Date')).toBeVisible()
})

test('stays visible when switching to Savings/Current/Overdraft or Credit Cards', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Savings' }).click()
  await expect(page.getByText('Credit Card Payments', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Credit Cards' }).click()
  await expect(page.getByText('Credit Card Payments', { exact: true })).toBeVisible()
})
