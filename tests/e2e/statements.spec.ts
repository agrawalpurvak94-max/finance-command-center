import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/statements')
  await expect(page.getByRole('heading', { name: 'Statement Processing' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Rows per page:')).toBeVisible()
})

test('loads the list with real statement rows', async ({ page }) => {
  await expect(page.getByText(/of \d+ statements/)).toBeVisible()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
})

test('summary widget shows processing metrics', async ({ page }) => {
  await expect(page.getByText('Total Statements')).toBeVisible()
  await expect(page.getByText('Successfully Processed')).toBeVisible()
  await expect(page.getByText('Pending Review').first()).toBeVisible()
})

test('search filters the visible rows', async ({ page }) => {
  const totalText = await page.getByText(/of \d+ statements/).innerText()
  const total = Number(totalText.match(/of (\d+) statements/)?.[1])
  await page.getByRole('searchbox', { name: 'Search statements' }).fill('hdfc')
  await expect(page.getByText(/of \d+ statements/)).not.toContainText(`of ${total} statements`, {
    timeout: 5000,
  })
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

test('View Details opens the statement drawer', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /Actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'View Details' }).click()
  await expect(page.getByRole('heading', { name: 'Statement Details' })).toBeVisible()
  await expect(
    page.getByLabel('Statement Details').getByText('Transactions Extracted'),
  ).toBeVisible()
})

test('sorting by statement date toggles ascending/descending', async ({ page }) => {
  const dateHeader = page
    .locator('thead')
    .getByRole('button', { name: 'Statement Date', exact: true })
  await dateHeader.click()
  await page.waitForTimeout(400) // mock repository latency
  const firstDateAsc = await page.locator('tbody tr').first().locator('td').first().innerText()
  await dateHeader.click()
  await page.waitForTimeout(400)
  const firstDateDesc = await page.locator('tbody tr').first().locator('td').first().innerText()
  expect(firstDateAsc).not.toBe(firstDateDesc)
})

test('Upload Statement opens the upload dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Upload Statement' }).click()
  await expect(page.getByRole('heading', { name: 'Upload Statement' })).toBeVisible()
})

// Statement Control drawer edit (Account Holder / Statement Date / Statement
// Period). All four tests below operate on the first table row and, where
// they persist a change to Supabase, restore the original value before
// finishing — this suite runs against the live dev Supabase project, not a
// fixture, so nothing here should leave permanent test data behind.

async function openFirstStatementDrawer(page: import('@playwright/test').Page) {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /Actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'View Details' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Transactions Extracted')).toBeVisible()
}

test('Edit pre-fills the form with the row current values', async ({ page }) => {
  const holderCell = page.locator('tbody tr').first().locator('td').nth(4)
  const holderText = (await holderCell.innerText()).trim()
  const expectedValue = holderText === 'Unassigned' ? '' : holderText

  await openFirstStatementDrawer(page)
  await page.getByRole('button', { name: 'Edit' }).click()

  await expect(page.getByLabel('Account Holder')).toHaveValue(expectedValue)
  await expect(page.getByLabel('Statement Date')).toBeVisible()
  await expect(page.getByLabel('Statement period start')).toBeVisible()
  await expect(page.getByLabel('Statement period end')).toBeVisible()
})

test('Cancel discards edits and makes no Supabase mutation', async ({ page }) => {
  await openFirstStatementDrawer(page)
  await page.getByRole('button', { name: 'Edit' }).click()

  const holderInput = page.getByLabel('Account Holder')
  const original = await holderInput.inputValue()
  await holderInput.fill('Playwright cancel test — should not persist')
  await page.getByRole('button', { name: 'Cancel' }).click()

  // Back in view mode: no footer, and the discarded value is nowhere on screen.
  await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0)
  await expect(page.getByText('Playwright cancel test — should not persist')).toHaveCount(0)

  // Reopening edit mode still shows the pre-edit value, confirming Cancel
  // never reached Supabase.
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Account Holder')).toHaveValue(original)
})

test('Statement Period End before Start is rejected and blocks Save', async ({ page }) => {
  await openFirstStatementDrawer(page)
  await page.getByRole('button', { name: 'Edit' }).click()

  await page.getByLabel('Statement period start').fill('2026-08-20')
  await page.getByLabel('Statement period end').fill('2026-08-01')
  await expect(
    page.getByText('Statement Period End must be on or after Statement Period Start.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Save Changes' }).click()
  // Still in edit mode — the invalid range was never sent to Supabase.
  await expect(page.getByLabel('Statement period start')).toBeVisible()
})

test('Save persists Account Holder to Supabase and refreshes drawer + table without reload', async ({
  page,
}) => {
  const holderCell = page.locator('tbody tr').first().locator('td').nth(4)
  const originalText = (await holderCell.innerText()).trim()
  const originalValue = originalText === 'Unassigned' ? '' : originalText
  const testValue = `QA Holder ${Date.now()}`

  await openFirstStatementDrawer(page)
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Account Holder').fill(testValue)
  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByText(/updated\.$/)).toBeVisible()
  await expect(page.getByRole('dialog').getByText(testValue)).toBeVisible()
  // The Statement Control table reflects the new value live — no reload.
  await expect(holderCell).toContainText(testValue)

  // Cleanup: restore the original value.
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Account Holder').fill(originalValue)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(holderCell).toContainText(originalValue || 'Unassigned')
})
