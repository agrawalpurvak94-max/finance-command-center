import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/merchants')
  await expect(page.getByRole('heading', { name: 'Merchant Center' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Rows per page:')).toBeVisible()
})

test('loads the list with real merchant rows', async ({ page }) => {
  await expect(page.getByText(/of \d+ merchants/)).toBeVisible()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
})

test('summary widget shows the five required KPIs', async ({ page }) => {
  await expect(page.getByText('Total Merchants')).toBeVisible()
  await expect(page.getByText('Active Merchants', { exact: true })).toBeVisible()
  await expect(page.getByText('Uncategorized Merchants')).toBeVisible()
  await expect(page.getByText('Total Spend', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Transactions This Month')).toBeVisible()
})

test('search filters the visible rows', async ({ page }) => {
  const totalText = await page.getByText(/of \d+ merchants/).innerText()
  const total = Number(totalText.match(/of (\d+) merchants/)?.[1])
  await page.getByRole('searchbox', { name: 'Search merchants' }).fill('adobe')
  await expect(page.getByText(/of \d+ merchants/)).not.toContainText(`of ${total} merchants`, {
    timeout: 5000,
  })
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr').first()).toContainText('Adobe Creative Cloud')
})

test('opening a row action menu shows Edit, Change Category, Merge (disabled), and Delete', async ({
  page,
}) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await expect(page.getByRole('menuitem', { name: 'Edit Merchant' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Change Category' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
  // Merge Merchants is a future placeholder — visible but marked "Soon" and
  // inert, per the spec's "Future placeholder: Merge Merchants".
  await expect(page.getByText('Merge Merchants')).toBeVisible()
  await expect(page.getByText('Soon')).toBeVisible()
})

test('the primary row action navigates to Transactions with the merchant filter applied', async ({
  page,
}) => {
  const firstRowName = await page.locator('tbody tr').first().locator('td').first().innerText()

  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /View transactions for/ })
    .click()

  await page.waitForURL(/\/transactions\?merchantId=/)
  await expect(page.getByRole('heading', { name: 'Transaction Ledger' })).toBeVisible()
  await expect(page.getByText(/Filtered by merchant:/)).toContainText(firstRowName.trim())
})

test('the Default Category cell is inline-editable', async ({ page }) => {
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow.getByRole('combobox')).toBeVisible()
})

test('Add Merchant opens the create dialog with all spec fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Merchant' }).click()
  await expect(page.getByRole('heading', { name: 'Add Merchant' })).toBeVisible()
  await expect(page.getByLabel('Merchant Name', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Default Category')).toBeVisible()
  await expect(page.getByLabel('Status')).toBeVisible()
  await expect(page.getByLabel('Notes')).toBeVisible()
  await expect(page.getByLabel('Aliases')).toBeDisabled()
  await expect(page.getByLabel('Merchant Rules')).toBeDisabled()
})

test('creating a merchant validates the required name field', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Merchant' }).click()
  // Base UI makes the rest of the page inert while the dialog is open, so
  // this now resolves uniquely to the dialog's own submit button.
  await page.getByRole('button', { name: 'Add Merchant' }).click()
  await expect(page.getByText('Enter a merchant name.')).toBeVisible()
})

test('editing a merchant prefills the form from the row', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'Edit Merchant' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Merchant' })).toBeVisible()
  const nameInput = page.getByLabel('Merchant Name', { exact: false })
  await expect(nameInput).not.toHaveValue('')
})

test('sorting by merchant name toggles ascending/descending', async ({ page }) => {
  const nameHeader = page
    .locator('thead')
    .getByRole('button', { name: 'Merchant Name', exact: true })
  await nameHeader.click()
  await page.waitForTimeout(400) // mock repository latency
  const firstNameAsc = await page.locator('tbody tr').first().locator('td').first().innerText()
  await nameHeader.click()
  await page.waitForTimeout(400)
  const firstNameDesc = await page.locator('tbody tr').first().locator('td').first().innerText()
  expect(firstNameAsc).not.toBe(firstNameDesc)
})
