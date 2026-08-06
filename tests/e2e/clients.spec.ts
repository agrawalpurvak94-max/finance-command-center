import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/clients')
  await expect(page.getByRole('heading', { name: 'Client Management' })).toBeVisible()
  // Wait for the mock data to finish loading before interacting.
  await expect(page.getByText('Rows per page:')).toBeVisible()
})

test('loads the list with real client rows', async ({ page }) => {
  await expect(page.getByText(/of \d+ clients/)).toBeVisible()
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
})

test('summary widget shows the four required KPIs', async ({ page }) => {
  await expect(page.getByText('Total Clients')).toBeVisible()
  await expect(page.getByText('Total Spent')).toBeVisible()
  await expect(page.getByText('Clients Requiring Review')).toBeVisible()
  await expect(page.getByText('Active Clients')).toBeVisible()
})

test('search filters the visible rows', async ({ page }) => {
  const totalText = await page.getByText(/of \d+ clients/).innerText()
  const total = Number(totalText.match(/of (\d+) clients/)?.[1])
  await page.getByRole('searchbox', { name: 'Search clients' }).fill('acme')
  await expect(page.getByText(/of \d+ clients/)).not.toContainText(`of ${total} clients`, {
    timeout: 5000,
  })
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr').first()).toContainText('Acme Corp')
})

test('table shows the spec-required columns', async ({ page }) => {
  const headerRow = page.locator('thead tr')
  await expect(headerRow.getByText('Client', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Email', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Company', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Phone', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Status', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Total Spend', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Transactions', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Accounts', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Cards', { exact: true })).toBeVisible()
  await expect(headerRow.getByText('Created Date', { exact: true })).toBeVisible()
})

test('opening a row action menu shows Review, Edit, and Delete', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await expect(page.getByRole('menuitem', { name: 'Review Client' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Edit Client' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
})

test('the primary row action navigates to Transactions with the client filter applied', async ({
  page,
}) => {
  // .innerText() on the whole cell would also pick up the avatar-initials
  // text ("AC") ahead of the name — scope to the name button itself.
  const firstRowName = await page
    .locator('tbody tr')
    .first()
    .locator('td')
    .first()
    .getByRole('button')
    .innerText()

  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /View transactions for/ })
    .click()

  await page.waitForURL(/\/transactions\?clientId=/)
  await expect(page.getByText(/Filtered by client:/)).toContainText(firstRowName.trim())
})

test('Add Client opens the create dialog with all spec fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Client' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add Client' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Client Name', { exact: false })).toBeVisible()
  await expect(dialog.getByLabel('Client Type')).toBeVisible()
  await expect(dialog.getByLabel('Company')).toBeVisible()
  await expect(dialog.getByLabel('Email')).toBeVisible()
  await expect(dialog.getByLabel('Phone')).toBeVisible()
  await expect(dialog.getByLabel('Status')).toBeVisible()
  await expect(dialog.getByLabel('Notes')).toBeVisible()
})

test('creating a client validates the required name field', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Client' }).click()
  await page.getByRole('button', { name: 'Add Client' }).click()
  await expect(page.getByText('Enter a client name.')).toBeVisible()
})

test('editing a client prefills the form and disables Client Type', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'Edit Client' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Client' })).toBeVisible()
  const nameInput = page.getByLabel('Client Name', { exact: false })
  await expect(nameInput).not.toHaveValue('')
  await expect(page.getByLabel('Client Type')).toBeDisabled()
})

test('deleting a client warns about associated records', async ({ page }) => {
  const menuButton = page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /More actions for/ })
  await menuButton.click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('heading', { name: 'Delete this client?' })).toBeVisible()
  await expect(page.getByText(/this client is associated with/i)).toBeVisible()
})

test('sorting by client name toggles ascending/descending', async ({ page }) => {
  const nameHeader = page.locator('thead').getByRole('button', { name: 'Client', exact: true })
  await nameHeader.click()
  await page.waitForTimeout(400) // mock repository latency
  const firstNameAsc = await page.locator('tbody tr').first().locator('td').first().innerText()
  await nameHeader.click()
  await page.waitForTimeout(400)
  const firstNameDesc = await page.locator('tbody tr').first().locator('td').first().innerText()
  expect(firstNameAsc).not.toBe(firstNameDesc)
})

test.describe('Client Review Drawer', () => {
  test('clicking the client name opens the drawer without navigating away', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()
    await expect(page).toHaveURL(/\/clients$/)
  })

  test('clicking anywhere else on the row also opens the drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('td').nth(2).click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()
  })

  test('the "Review Client" menu item opens the drawer', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.getByRole('button', { name: /More actions for/ }).click()
    await page.getByRole('menuitem', { name: 'Review Client' }).click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()
  })

  test('shows all seven sections with the expected fields', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    const drawer = page.getByLabel('Client Review')
    await expect(drawer).toBeVisible()

    // Section 1 — Client Profile
    await expect(drawer.getByLabel('Client Name', { exact: false })).toBeVisible()
    await expect(drawer.getByText('Client Type', { exact: true })).toBeVisible()
    await expect(drawer.getByLabel('Company', { exact: false })).toBeVisible()
    await expect(drawer.getByLabel('Email', { exact: false })).toBeVisible()
    await expect(drawer.getByLabel('Phone', { exact: false })).toBeVisible()
    await expect(drawer.getByLabel('Status', { exact: false })).toBeVisible()
    await expect(drawer.getByText('Current Status')).toBeVisible()

    // Section 2 — Financial Summary
    await expect(drawer.getByText('Financial Summary')).toBeVisible()
    await expect(drawer.getByText('Total Spend', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Linked Accounts')).toBeVisible()
    await expect(drawer.getByText('Linked Credit Cards')).toBeVisible()
    await expect(drawer.getByText('Linked Statements')).toBeVisible()
    await expect(drawer.getByText('First Transaction')).toBeVisible()

    // Section 3/4 — Top Categories / Top Merchants
    await expect(drawer.getByText('Top Categories')).toBeVisible()
    await expect(drawer.getByText('Top Merchants')).toBeVisible()

    // Section 5/6 — Recent Transactions / Statements
    await expect(drawer.getByText('Recent Transactions')).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Transactions' })).toBeVisible()
    await expect(drawer.getByRole('heading', { name: 'Statements' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'View All Statements' })).toBeVisible()

    // Section 7 — Notes
    await expect(drawer.getByLabel('Internal Notes')).toBeVisible()
  })

  test('View All Transactions navigates to Transactions with the client filter applied', async ({
    page,
  }) => {
    const firstRow = page.locator('tbody tr').first()
    const firstRowName = await firstRow.locator('td').first().getByRole('button').innerText()
    await firstRow.locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()

    await page.getByRole('button', { name: 'View All Transactions' }).click()
    await page.waitForURL(/\/transactions\?clientId=/)
    await expect(page.getByText(/Filtered by client:/)).toContainText(firstRowName.trim())
  })

  test('View All Statements navigates to Statements with the client filter applied', async ({
    page,
  }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()

    await page.getByRole('button', { name: 'View All Statements' }).click()
    await page.waitForURL(/\/statements\?clientId=/)
    await expect(page.getByText(/Filtered by client:/)).toBeVisible()
  })

  test('View Accounts navigates to Accounts with the client filter applied', async ({ page }) => {
    // Vortex AI is seeded with one linked bank account and one linked
    // credit card, so both drill-down links render (they're conditional on
    // count > 0).
    await page.getByRole('searchbox', { name: 'Search clients' }).fill('vortex')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()

    const drawer = page.getByLabel('Client Review')
    await drawer.getByRole('button', { name: 'View' }).first().click()
    await page.waitForURL(/\/accounts\?clientId=/)
    await expect(page.getByText(/Filtered by client:/)).toContainText('Vortex AI')
  })

  test('View Credit Cards navigates to Credit Cards with the client filter applied', async ({
    page,
  }) => {
    // Fresh navigation (not a re-use of a previously opened drawer) — local
    // drawer state isn't part of the URL, so it doesn't survive a route
    // change and shouldn't be relied on to persist across one.
    await page.getByRole('searchbox', { name: 'Search clients' }).fill('vortex')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()

    const drawer = page.getByLabel('Client Review')
    await drawer.getByRole('button', { name: 'View' }).nth(1).click()
    await page.waitForURL(/\/credit-cards\?clientId=/)
    await expect(page.getByText(/Filtered by client:/)).toContainText('Vortex AI')
  })

  test('Cancel closes the drawer without saving changes', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    const nameInput = page.getByLabel('Client Name', { exact: false })
    const originalValue = await nameInput.inputValue()
    await nameInput.fill('Should not persist')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).not.toBeVisible()
    await expect(page.locator('tbody tr').first()).toContainText(originalValue)
  })

  test('Escape closes the drawer', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    await expect(page.getByRole('heading', { name: 'Client Review' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Client Review' })).not.toBeVisible()
  })

  test('Save Changes persists the edit and shows a success toast', async ({ page }) => {
    await page.locator('tbody tr').first().locator('td').first().getByRole('button').click()
    const nameInput = page.getByLabel('Client Name', { exact: false })
    await nameInput.fill('Acme Corp QA')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByRole('heading', { name: 'Client Review' })).not.toBeVisible()
    await expect(page.getByRole('status')).toContainText('Acme Corp QA saved.')
    await expect(page.locator('tbody tr').first()).toContainText('Acme Corp QA')
  })

  test('closing the drawer restores focus to the row that opened it', async ({ page }) => {
    const nameButton = page.locator('tbody tr').first().locator('td').first().getByRole('button')
    await nameButton.click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Client Review' })).not.toBeVisible()
    await expect(nameButton).toBeFocused()
  })
})
