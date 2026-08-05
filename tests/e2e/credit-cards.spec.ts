import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/credit-cards')
  await expect(page.getByRole('heading', { name: 'Credit Cards' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText(/of \d+ credit cards/)).toBeVisible()
})

test('loads the grid with 16+ real credit card tiles', async ({ page }) => {
  await expect(page.getByText(/of \d+ credit cards/)).toContainText('of 16 credit cards')
  await expect(page.getByRole('button', { name: /^View / })).toHaveCount(16)
})

test('summary widget shows the five required KPIs', async ({ page }) => {
  await expect(page.getByText('Total Credit Cards')).toBeVisible()
  await expect(page.getByText('Total Credit Limit')).toBeVisible()
  await expect(page.getByText('Total Outstanding')).toBeVisible()
  await expect(page.getByText('Total Available Credit')).toBeVisible()
  await expect(page.getByText('Statements Imported This Month')).toBeVisible()
})

test('search filters the visible tiles', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search credit cards' }).fill('amex')
  await expect(page.getByText(/of \d+ credit cards/)).not.toContainText('of 16 credit cards', {
    timeout: 5000,
  })
})

test('Add Credit Card opens the create dialog with all spec fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Credit Card' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add Credit Card' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Bank', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Card Name', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Network', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Last 4 Digits', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Credit Limit', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Statement Date')).toBeVisible()
  await expect(dialog.getByLabel('Due Date')).toBeVisible()
  await expect(dialog.getByLabel('Status')).toBeVisible()
})

test('creating a credit card validates required fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Credit Card' }).click()
  await page.getByRole('button', { name: 'Add Credit Card' }).click()
  await expect(page.getByText('Enter a bank name.')).toBeVisible()
  await expect(page.getByText('Enter a card name.')).toBeVisible()
  await expect(page.getByText('Enter exactly 4 digits.')).toBeVisible()
  await expect(page.getByText('Enter a credit limit greater than 0.')).toBeVisible()
})

test.describe('Credit Card Drawer', () => {
  test('clicking a tile opens the drawer without navigating away', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Card Review' })).toBeVisible()
    await expect(page).toHaveURL(/\/credit-cards$/)
  })

  test('shows all five sections with the expected fields', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    const drawer = page.getByLabel('Card Review')
    await expect(drawer).toBeVisible()

    await expect(drawer.getByLabel('Nickname', { exact: false })).toBeVisible()
    await expect(drawer.getByText('Financial Overview')).toBeVisible()
    await expect(drawer.getByText('Credit Limit', { exact: true }).first()).toBeVisible()
    await expect(drawer.getByText('Utilization', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Latest Transactions')).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Transactions' })).toBeVisible()
    await expect(drawer.getByRole('heading', { name: 'Statements' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Statements' })).toBeVisible()
    await expect(drawer.getByLabel('Internal Notes')).toBeVisible()
  })

  test('View All Transactions navigates to Transactions with the credit card filter applied', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Card Review' })).toBeVisible()
    await page.getByRole('button', { name: 'View All Transactions' }).click()
    await page.waitForURL(/\/transactions\?creditCardId=/)
    await expect(page.getByText(/Filtered by credit card:/)).toBeVisible()
  })

  test('View All Statements navigates to Statements with the account filter applied', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Card Review' })).toBeVisible()
    await page.getByRole('button', { name: 'View All Statements' }).click()
    await page.waitForURL(/\/statements\?accountId=/)
    await expect(page.getByText(/Filtered by account:/)).toBeVisible()
  })

  test('Escape closes the drawer', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Card Review' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Card Review' })).not.toBeVisible()
  })

  test('Save Changes persists the nickname edit and shows a success toast', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    const nicknameInput = page.getByLabel('Nickname', { exact: false })
    await nicknameInput.fill('QA Test Card Nickname')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByRole('heading', { name: 'Card Review' })).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('QA Test Card Nickname saved.')
  })
})
