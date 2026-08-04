import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/categories')
  await expect(page.getByRole('heading', { name: 'Category Management' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Rows per page:')).toBeVisible()
})

test('loads the list with real category rows', async ({ page }) => {
  await expect(page.getByText(/of \d+ categories/)).toBeVisible()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
})

test('summary widget shows the four required KPIs', async ({ page }) => {
  await expect(page.getByText('Total Categories')).toBeVisible()
  await expect(page.getByText('Active Categories', { exact: true })).toBeVisible()
  await expect(page.getByText('Inactive Categories')).toBeVisible()
  await expect(page.getByText('Uncategorized Transactions')).toBeVisible()
})

test('search filters the visible rows', async ({ page }) => {
  const totalText = await page.getByText(/of \d+ categories/).innerText()
  const total = Number(totalText.match(/of (\d+) categories/)?.[1])
  await page.getByRole('searchbox', { name: 'Search categories' }).fill('cloud')
  await expect(page.getByText(/of \d+ categories/)).not.toContainText(`of ${total} categories`, {
    timeout: 5000,
  })
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr').first()).toContainText('Cloud Infrastructure')
})

test('opening a row action menu shows Edit, View Merchants, and Delete', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'View Merchants' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
})

test('the primary row action navigates to Transactions with the category filter applied', async ({
  page,
}) => {
  const firstRowName = await page.locator('tbody tr').first().locator('td').first().innerText()

  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /View transactions for/ })
    .click()

  await page.waitForURL(/\/transactions\?categoryId=/)
  await expect(page.getByRole('heading', { name: 'Transaction Ledger' })).toBeVisible()
  await expect(page.getByText(/Filtered by category:/)).toContainText(firstRowName.trim())
})

test('Add Category opens the create dialog with all spec fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Category' }).click()
  await expect(page.getByRole('heading', { name: 'Add Category' })).toBeVisible()
  await expect(page.getByLabel('Category Name', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Parent Category')).toBeVisible()
  await expect(page.getByLabel('Description', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Status')).toBeVisible()
  await expect(page.getByLabel('Color')).toBeVisible()
  await expect(page.getByLabel('Icon')).toBeVisible()
  await expect(page.getByLabel('Icon')).toBeDisabled()
})

test('creating a category validates required fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Category' }).click()
  await page.getByRole('button', { name: 'Create Category' }).click()
  await expect(page.getByText('Enter a category name.')).toBeVisible()
  await expect(page.getByText('Enter a description.')).toBeVisible()
})

test('editing a category prefills the form from the row', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Category' })).toBeVisible()
  const nameInput = page.getByLabel('Category Name', { exact: false })
  await expect(nameInput).not.toHaveValue('')
})

test('sorting by category name toggles ascending/descending', async ({ page }) => {
  const nameHeader = page
    .locator('thead')
    .getByRole('button', { name: 'Category Name', exact: true })
  await nameHeader.click()
  await page.waitForTimeout(400) // mock repository latency
  const firstNameAsc = await page.locator('tbody tr').first().locator('td').first().innerText()
  await nameHeader.click()
  await page.waitForTimeout(400)
  const firstNameDesc = await page.locator('tbody tr').first().locator('td').first().innerText()
  expect(firstNameAsc).not.toBe(firstNameDesc)
})
