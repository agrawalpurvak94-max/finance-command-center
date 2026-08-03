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
