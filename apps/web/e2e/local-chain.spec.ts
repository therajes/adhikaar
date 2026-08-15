import { expect, test } from '@playwright/test'

test('real Anvil two-of-three validator flow executes on-chain', async ({ page }) => {
  test.skip(process.env.ADHIKAAR_CHAIN_TEST !== '1', 'Requires deterministic local Anvil and deployed registry')
  await page.goto('/validators')
  await expect(page.locator('#chain-badge')).toContainText('Connected')
  const state = page.locator('#registry-state')
  if (await state.getByText('Not registered').isVisible()) {
    await page.getByRole('button', { name: 'Run two-of-three approval' }).click()
    await expect(page.locator('#validator-progress')).toContainText('Two-of-three threshold reached')
  }
  await expect(state).toContainText('Active on-chain')
})
