import { expect, test } from '@playwright/test'

const credentials = {
  citizen: ['citizen.demo@example.com', 'Citizen@2026'],
  employee: ['aarav.employee@example.com', 'Employee@2026'],
  administrator: ['meera.admin@example.com', 'Admin@2026']
} as const

async function login(page: import('@playwright/test').Page, role: keyof typeof credentials): Promise<void> {
  await page.goto(role === 'citizen' ? '/login?role=citizen' : '/login?role=organisation')
  const [email, password] = credentials[role]
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Continue securely' }).click()
  await expect(page.locator('.dashboard-welcome')).toBeVisible()
}

test('receiver and employee complete a valid proof from separate authenticated devices', async ({ browser }) => {
  const receiverContext = await browser.newContext()
  const receiver = await receiverContext.newPage()
  await login(receiver, 'citizen')
  await expect(receiver.getByText('Swift verification ready')).toBeVisible()
  const challenge = (await receiver.locator('#challenge').textContent())?.trim()
  expect(challenge).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)

  const employeeContext = await browser.newContext()
  const employee = await employeeContext.newPage()
  await login(employee, 'employee')
  await expect(employee.locator('#key-status')).toContainText('Ready')
  await employee.locator('#employee-challenge').fill(challenge!)
  await employee.getByRole('button', { name: 'Create 90-second proof' }).click()
  await expect(employee.getByText('Signed by this device')).toBeVisible()
  const verificationCode = (await employee.locator('.proof-share strong').textContent())?.trim()
  expect(verificationCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)

  await receiver.locator('#verification-code').fill(verificationCode!)
  await receiver.getByRole('button', { name: 'Check what they are allowed to ask' }).click()
  await expect(receiver.getByText('VERIFIED AND AUTHORISED')).toBeVisible()
  await receiver.getByText('See technical proof').click()
  await expect(receiver.getByText('Swift WebAssembly', { exact: true })).toBeVisible()
  await receiverContext.close()
  await employeeContext.close()
})

test('employee dashboard blocks an OTP request before issuance', async ({ page }) => {
  await login(page, 'employee')
  await page.getByRole('button', { name: 'Demonstrate a blocked OTP request' }).click()
  await expect(page.getByText('OTP request blocked before issuance')).toBeVisible()
})

test('role boundary prevents a citizen from opening the employee workspace', async ({ page }) => {
  await login(page, 'citizen')
  await page.goto('/representative')
  await expect(page.getByRole('heading', { name: 'This dashboard belongs to a different role.' })).toBeVisible()
  await expect(page.getByText('/representative', { exact: true })).toBeVisible()
})

test('real Swift engine returns all twelve expected attack verdicts', async ({ page }) => {
  await page.goto('/attack-lab')
  await expect(page.getByText('Swift verification ready')).toBeVisible()
  await page.getByRole('button', { name: 'Run all 12 checks' }).click()
  await expect(page.locator('#suite-summary')).toContainText('12/12')
  await expect(page.locator('.attack-card.passed')).toHaveCount(12)
})

test('Hindi receiver flow updates language metadata and safety copy', async ({ page }) => {
  await login(page, 'citizen')
  await page.getByRole('button', { name: 'Change language' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expect(page.getByRole('heading', { name: 'जानें कि क्या करना सुरक्षित है' })).toBeVisible()
  await expect(page.getByText(/OTP, PIN, पासवर्ड या CVV कभी साझा न करें/)).toBeVisible()
})

test('keyboard users can reach the main content directly', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeInViewport()
})

test('institution revocation changes an existing signed proof verdict across devices', async ({ browser }) => {
  const receiverContext = await browser.newContext()
  const employeeContext = await browser.newContext()
  const administratorContext = await browser.newContext()
  const receiver = await receiverContext.newPage()
  const employee = await employeeContext.newPage()
  const administrator = await administratorContext.newPage()
  await login(receiver, 'citizen')
  await login(employee, 'employee')
  const challenge = (await receiver.locator('#challenge').textContent())!.trim()
  await employee.locator('#employee-challenge').fill(challenge)
  await employee.getByRole('button', { name: 'Create 90-second proof' }).click()
  const verificationCode = (await employee.locator('.proof-share strong').textContent())!.trim()

  await login(administrator, 'administrator')
  await expect(administrator.getByRole('button', { name: 'Revoke fictional credential' })).toBeEnabled()
  await administrator.getByRole('button', { name: 'Revoke fictional credential' }).click()
  await expect(administrator.getByText('Credential permanently revoked')).toBeVisible()

  await receiver.locator('#verification-code').fill(verificationCode)
  await receiver.getByRole('button', { name: 'Check what they are allowed to ask' }).click()
  await expect(receiver.getByRole('heading', { name: 'CREDENTIAL REVOKED' })).toBeVisible()
  await receiverContext.close()
  await employeeContext.close()
  await administratorContext.close()
})
