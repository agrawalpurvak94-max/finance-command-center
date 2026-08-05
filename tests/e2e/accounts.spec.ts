import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/accounts')
  await expect(page.getByRole('heading', { name: 'Financial Accounts' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText(/of \d+ bank accounts/)).toBeVisible()
})

test('loads the grid with real bank account cards', async ({ page }) => {
  await expect(page.getByText(/of \d+ bank accounts/)).toContainText('of 5 bank accounts')
  await expect(page.getByRole('button', { name: /^View / }).first()).toBeVisible()
})

test('summary widget shows the four required KPIs', async ({ page }) => {
  await expect(page.getByText('Total Bank Accounts')).toBeVisible()
  await expect(page.getByText('Total Current Balance')).toBeVisible()
  await expect(page.getByText('Total Available Balance')).toBeVisible()
  await expect(page.getByText('Statements Imported This Month')).toBeVisible()
})

test('search filters the visible cards', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search bank accounts' }).fill('axis')
  await expect(page.getByText(/of \d+ bank accounts/)).toContainText('of 1 bank accounts', {
    timeout: 5000,
  })
})

test('Link Account opens the create dialog with all spec fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Link Account' }).click()
  const dialog = page.getByRole('dialog', { name: 'Link Bank Account' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Bank', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Account Type')).toBeVisible()
  await expect(dialog.getByLabel('Account Name', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Nickname')).toBeVisible()
  await expect(dialog.getByLabel('Account Number', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Opening Balance')).toBeVisible()
  await expect(dialog.getByLabel('Status')).toBeVisible()
})

test('creating a bank account validates required fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Link Account' }).click()
  await page.getByRole('button', { name: 'Link Account' }).click()
  await expect(page.getByText('Enter a bank name.')).toBeVisible()
  await expect(page.getByText('Enter an account name.')).toBeVisible()
})

test('Sync All refreshes account data', async ({ page }) => {
  await page.getByRole('button', { name: 'Sync All' }).click()
  await expect(page.getByRole('status')).toContainText('All accounts synced.')
})

test.describe('Bank Account Drawer', () => {
  test('clicking a card opens the drawer without navigating away', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Account Review' })).toBeVisible()
    await expect(page).toHaveURL(/\/accounts$/)
  })

  test('shows all five sections with the expected fields', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    const drawer = page.getByLabel('Account Review')
    await expect(drawer).toBeVisible()

    await expect(drawer.getByLabel('Nickname', { exact: false })).toBeVisible()
    await expect(drawer.getByText('Financial Overview')).toBeVisible()
    await expect(drawer.getByText('Current Balance')).toBeVisible()
    await expect(drawer.getByText('Available Balance').first()).toBeVisible()
    await expect(drawer.getByText('Latest Transactions')).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Transactions' })).toBeVisible()
    await expect(drawer.getByRole('heading', { name: 'Statements' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Statements' })).toBeVisible()
    await expect(drawer.getByLabel('Internal Notes')).toBeVisible()
  })

  test('View All Transactions navigates to Transactions with the bank account filter applied', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Account Review' })).toBeVisible()
    await page.getByRole('button', { name: 'View All Transactions' }).click()
    await page.waitForURL(/\/transactions\?bankAccountId=/)
    await expect(page.getByText(/Filtered by bank account:/)).toBeVisible()
  })

  test('View All Statements navigates to Statements with the account filter applied', async ({
    page,
  }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Account Review' })).toBeVisible()
    await page.getByRole('button', { name: 'View All Statements' }).click()
    await page.waitForURL(/\/statements\?accountId=/)
    await expect(page.getByText(/Filtered by account:/)).toBeVisible()
  })

  test('Escape closes the drawer', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Account Review' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Account Review' })).not.toBeVisible()
  })

  test('Save Changes persists the nickname edit and shows a success toast', async ({ page }) => {
    await page
      .getByRole('button', { name: /^View / })
      .first()
      .click()
    const nicknameInput = page.getByLabel('Nickname', { exact: false })
    await nicknameInput.fill('QA Test Nickname')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByRole('heading', { name: 'Account Review' })).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('QA Test Nickname saved.')
  })
})
