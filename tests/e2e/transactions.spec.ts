import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transaction Ledger' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Rows per page:')).toBeVisible()
})

test('loads the ledger with real transaction rows', async ({ page }) => {
  await expect(page.getByText(/of 320 transactions/)).toBeVisible()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
})

test('search filters the visible rows', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('Amazon Web Services')
  // The mock dataset has many "Amazon Web Services" rows, so assert the
  // total count actually shrank from the unfiltered 320, and every visible
  // merchant name matches — not a brittle exact row count.
  await expect(page.getByText(/of \d+ transactions/)).not.toContainText('of 320 transactions', {
    timeout: 5000,
  })
  const merchantCells = page.locator('tbody tr td:nth-child(3)')
  const count = await merchantCells.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(merchantCells.nth(i)).toContainText('Amazon Web Services')
  }
})

test('selecting rows reveals the bulk action toolbar', async ({ page }) => {
  await expect(page.getByText('selected')).not.toBeVisible()
  const firstCheckbox = page.locator('tbody tr').first().getByRole('checkbox')
  await firstCheckbox.click()
  await expect(page.getByText('1 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as Reviewed' })).toBeVisible()
})

test('opening a row action menu shows View Details and Delete', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /Actions for/ })
  await menuButton.click()
  await expect(page.getByRole('menuitem', { name: 'View Details' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
})

test('View Details opens the transaction drawer', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /Actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'View Details' }).click()
  await expect(page.getByRole('heading', { name: 'Transaction Details' })).toBeVisible()
  await expect(page.getByText('Audit Timeline')).toBeVisible()
})

test('sorting by amount toggles ascending/descending', async ({ page }) => {
  const amountHeader = page.locator('thead').getByRole('button', { name: 'Amount', exact: true })
  await amountHeader.click()
  await page.waitForTimeout(400) // mock repository latency
  const firstAmountAsc = await page.locator('tbody tr').first().locator('td').nth(7).innerText()
  await amountHeader.click()
  await page.waitForTimeout(400)
  const firstAmountDesc = await page.locator('tbody tr').first().locator('td').nth(7).innerText()
  expect(firstAmountAsc).not.toBe(firstAmountDesc)
})

test('the floating action button opens New Transaction', async ({ page }) => {
  await page.getByRole('button', { name: 'Quick Add Transaction' }).click()
  await expect(page.getByRole('heading', { name: 'New Transaction' })).toBeVisible()
})
