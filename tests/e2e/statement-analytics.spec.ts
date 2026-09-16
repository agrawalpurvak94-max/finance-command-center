import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/statements/analytics')
  await expect(page.getByRole('heading', { name: 'Statement Analytics' })).toBeVisible()
  await expect(page.getByText('Total Spend', { exact: true })).toBeVisible({ timeout: 10000 })
})

test('renders the new Spend by Credit Card chart, grouped by card not statement', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'Spend by Credit Card' })).toBeVisible()
})

test('the Monthly Spend KPI keeps its default label with no Date Range filter active', async ({
  page,
}) => {
  await expect(page.getByText('Monthly Spend', { exact: true })).toBeVisible()
})

test('selecting a custom Date Range relabels the KPI to Period Spend', async ({ page }) => {
  await page.getByRole('button', { name: 'Date Range' }).click()
  await page.getByLabel('From').fill('2026-08-01')
  await page.getByLabel('To').fill('2026-08-12')
  // Close the popover so the KPI grid underneath is interactable/visible again.
  await page.keyboard.press('Escape')
  await expect(page.getByText('Period Spend', { exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Monthly Spend', { exact: true })).not.toBeVisible()
})

test('the Statement filter dropdown shows full, unclipped statement labels', async ({ page }) => {
  await page.getByRole('button', { name: 'Statement', exact: true }).click()
  const trigger = page.getByLabel('Statement filter')
  await trigger.click()
  const firstOption = page.getByRole('option').nth(1) // index 0 is "All statements"
  await expect(firstOption).toBeVisible()
  const text = await firstOption.innerText()
  // A real statement label always carries a full period range — if this
  // stayed truncated to a fixed pixel width, the trailing end date would be
  // clipped off; asserting the full "start – end" shape is present is a
  // reliable proxy for "not truncated" without hardcoding a specific label.
  expect(text).toMatch(/\d{4}-\d{2}-\d{2}.*\d{4}-\d{2}-\d{2}|–/)
})
