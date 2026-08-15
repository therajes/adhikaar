import { expect, test } from '@playwright/test'

test('mobile receiver and employee entry points remain usable', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Check the request/ })).toBeVisible()
  await expect(page.locator('.mobile-nav')).toBeVisible()
  await page.getByRole('link', { name: 'Citizen sign in' }).click()
  await page.getByRole('button', { name: 'Enter demo' }).click()
  await expect(page.locator('#verification-code')).toBeVisible()
  await expect(page.locator('.scan-button')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('/login?role=organisation')
  await page.locator('.demo-credential').filter({ hasText: 'Organisation employee' }).getByRole('button', { name: 'Enter demo' }).click()
  await expect(page.getByRole('heading', { name: 'Create a trusted interaction proof' })).toBeVisible()
  await expect(page.locator('#employee-challenge')).toBeVisible()
})
