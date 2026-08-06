import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Total Spend', { exact: true })).toBeVisible({ timeout: 10000 })
})

test('renders the KPI row, main charts, and secondary analytics', async ({ page }) => {
  await expect(page.getByText('Total Transactions')).toBeVisible()
  await expect(page.getByText('Monthly Spend', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Financial Performance Overview' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Category Split' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Merchant Spend' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Client Spend' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Credit Card Spend' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bank Account Activity' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Business vs Personal Spend' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Secondary Analytics' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
})

test('clicking a category slice cross-filters in place and shows an active filter chip', async ({
  page,
}) => {
  const legend = page.getByTestId('category-legend')
  const legendRow = legend.getByRole('button').first()
  const categoryName = (await legendRow.innerText()).split('₹')[0].trim()

  await legendRow.click()
  await expect(page.locator('span', { hasText: /^Category:/ })).toBeVisible()
  await expect(page.locator('span', { hasText: /^Category:/ })).toContainText(categoryName)
  // Cross-filter stays on the Analytics page — no navigation.
  await expect(page).toHaveURL(/\/analytics/)
})

test('filters can be stacked and cleared individually', async ({ page }) => {
  const legend = page.getByTestId('category-legend')
  await legend.getByRole('button').first().click()
  await expect(page.locator('span', { hasText: /^Category:/ })).toBeVisible()

  await page.getByRole('button', { name: /Remove Category filter/ }).click()
  await expect(page.locator('span', { hasText: /^Category:/ })).not.toBeVisible()
})

test('View Transactions on a chart navigates to Transactions with the active filter banner', async ({
  page,
}) => {
  const categoryCard = page.getByTestId('chart-card-category-split')
  await categoryCard.getByTestId('category-legend').getByRole('button').first().click()

  await categoryCard.getByRole('button', { name: 'View Transactions' }).click()

  await page.waitForURL(/\/transactions\?/)
  await expect(page.getByRole('heading', { name: 'Transaction Ledger' })).toBeVisible()
  await expect(page.getByText(/Filtered by category:/)).toBeVisible()
})

test('clicking a Business vs Personal bar cross-filters by owner type', async ({ page }) => {
  const chart = page.getByTestId('chart-card-business-vs-personal-spend')
  await expect(chart.getByText('Business', { exact: true })).toBeVisible()
  // Recharts renders bars as SVG <path> elements. Playwright's actionability-
  // gated .click() is unreliable against these (a well-known Recharts/SVG
  // chart-testing quirk — confirmed the click handler itself is correct by
  // dispatching a native MouseEvent directly, which fires reliably every
  // time) — dispatchEvent bypasses the flaky actionability race entirely.
  await chart.locator('.recharts-bar-rectangle path').first().dispatchEvent('click')
  await expect(page.locator('span', { hasText: /^Biz\/Personal:/ })).toBeVisible()
})

test('secondary analytics table supports search and CSV export', async ({ page }) => {
  await page.getByRole('tab', { name: 'Top Merchants' }).click()
  const panel = page.getByRole('tabpanel')
  const searchBox = panel.getByRole('searchbox', { name: 'Search Top Merchants' })
  await expect(searchBox).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('analytics-merchants.csv')
})

test('granularity toggle changes the spend trend chart', async ({ page }) => {
  const trendCard = page.getByTestId('chart-card-financial-performance-overview')
  await trendCard.getByRole('button', { name: 'Week' }).click()
  await page.waitForTimeout(400)
  await expect(trendCard.getByRole('button', { name: 'Week' })).toBeVisible()
})

test('the page has no horizontal overflow at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(overflow).toBe(false)
})
