import { test, expect } from '@playwright/test'

test('redirige de / a /login cuando no hay sesión activa y muestra el acceso institucional', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login(\?.*)?$/)
  await expect(page.getByRole('heading', { name: /Iniciar Sesión/i })).toBeVisible()
})
