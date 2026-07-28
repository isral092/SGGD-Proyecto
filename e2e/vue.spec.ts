import { test, expect } from '@playwright/test'

test('muestra el formulario de registro en la página principal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Registro de Garantía Digital' })).toBeVisible()
})
