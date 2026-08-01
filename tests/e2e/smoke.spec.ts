import { test, expect } from '@playwright/test'

test('app shell boots with sidebar navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Financial Accounts' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Credit Cards' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Operational Command Center' })).toBeVisible()
})

test('dashboard widgets load with real data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Financial Snapshot')).toBeVisible()
  await expect(page.getByText('Total Spend (MTD)')).toBeVisible()
  await expect(page.getByText('Resolution Queue')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resolve' }).first()).toBeVisible()
  await expect(page.getByText('Recent Transactions')).toBeVisible()
})

test('sidebar navigation routes to the correct module', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Transactions' }).click()
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
})
