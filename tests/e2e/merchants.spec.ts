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

test('opening a row action menu shows Review, Edit, Change Category, Merge (disabled), and Delete', async ({
  page,
}) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await expect(page.getByRole('menuitem', { name: 'Review Merchant' })).toBeVisible()
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

test.describe('Merchant Review Drawer', () => {
  test('clicking the merchant name opens the drawer without navigating away', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
    // Table stays mounted (visually present) behind the drawer — not a page
    // navigation. Checked via a plain text locator rather than getByRole:
    // Base UI correctly marks the rest of the page aria-hidden while the
    // modal drawer is open, which is exactly what a11y-aware role queries
    // are supposed to skip — that's the drawer working as a modal, not the
    // table having unmounted.
    await expect(page).toHaveURL(/\/merchants$/)
    await expect(page.locator('#main-content').getByText('Merchant Center')).toBeVisible()
  })

  test('clicking anywhere else on the row also opens the drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    // Click a cell that isn't the name button or an interactive control.
    await firstRow.locator('td').nth(2).click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
  })

  test('the "Review Merchant" menu item opens the drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.getByRole('button', { name: /More actions for/ }).click()
    await page.getByRole('menuitem', { name: 'Review Merchant' }).click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
  })

  test('clicking an interactive cell does not also open the drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    // The inline category selector is itself interactive — clicking it
    // must not also trigger the whole-row "open drawer" behavior.
    await firstRow.getByRole('combobox').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('shows all four sections with the expected fields', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()

    // Section 1 — Identity
    await expect(page.getByLabel('Merchant Name', { exact: false })).toBeVisible()
    await expect(page.getByLabel('Status', { exact: false })).toBeVisible()
    await expect(page.getByText('Current Status')).toBeVisible()
    await expect(page.getByLabel('Merchant ID')).toBeDisabled()

    // Section 2 — Classification
    await expect(page.getByText('Classification')).toBeVisible()
    await expect(page.getByLabel('Client Mapping')).toBeDisabled()
    await expect(page.getByLabel('Notes', { exact: false })).toBeVisible()

    // Section 3 — Merchant Intelligence (read-only)
    const drawer = page.getByLabel('Merchant Review')
    await expect(drawer.getByText('Merchant Intelligence')).toBeVisible()
    await expect(drawer.getByText('Total Transactions')).toBeVisible()
    await expect(drawer.getByText('Average Transaction')).toBeVisible()
    await expect(drawer.getByText('First Seen')).toBeVisible()
    await expect(drawer.getByText('Last Transaction')).toBeVisible()

    // Section 4 — Recent Transactions
    await expect(page.getByText('Recent Transactions')).toBeVisible()
    await expect(page.getByRole('button', { name: 'View All Transactions' })).toBeVisible()
  })

  test('View All Transactions navigates to Transactions with the merchant filter applied, reusing the drill-down banner', async ({
    page,
  }) => {
    const firstRowName = await page.locator('tbody tr').first().locator('td').first().innerText()
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()

    await page.getByRole('button', { name: 'View All Transactions' }).click()
    await page.waitForURL(/\/transactions\?merchantId=/)
    await expect(page.getByText(/Filtered by merchant:/)).toContainText(firstRowName.trim())
  })

  test('Cancel closes the drawer without saving changes', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    const nameInput = page.getByLabel('Merchant Name', { exact: false })
    const originalValue = await nameInput.inputValue()
    await nameInput.fill('Should not persist')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
    await expect(page.locator('tbody tr').first()).toContainText(originalValue)
  })

  test('Escape closes the drawer', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
  })

  test('Save Changes persists the edit and shows a success toast', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    const nameInput = page.getByLabel('Merchant Name', { exact: false })
    await nameInput.fill('Adobe Creative Cloud QA')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('Adobe Creative Cloud QA saved.')
    await expect(page.locator('tbody tr').first()).toContainText('Adobe Creative Cloud QA')
  })

  test('closing the drawer restores focus to the row that opened it', async ({ page }) => {
    const nameButton = page.locator('tbody tr').first().locator('td').first().getByRole('button')
    await nameButton.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
    await expect(nameButton).toBeFocused()
  })

  test('the selected row stays visually highlighted while the drawer is open, and unhighlights on close', async ({
    page,
  }) => {
    const row = page.locator('tbody tr').nth(1)
    const classBefore = await row.getAttribute('class')
    await row.locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
    await expect(row).toHaveClass(/bg-accent\/60/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()
    await expect(row).toHaveClass(classBefore ?? '')
  })

  test('closing the drawer preserves the table scroll position', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Rows per page' }).click()
    await page.getByRole('option', { name: '25' }).click()
    await expect(page.getByText('Rows per page:')).toBeVisible()

    const row = page.locator('tbody tr').nth(10)
    await row.scrollIntoViewIfNeeded()
    await page.waitForTimeout(100)
    const scrollBefore = await page.evaluate(() => window.scrollY)

    await row.locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Merchant Review' })).not.toBeVisible()

    await expect(async () => {
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
    }).toPass({ timeout: 2000 })
  })
})
