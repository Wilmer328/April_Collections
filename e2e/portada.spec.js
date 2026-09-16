/**
 * La portada: lo primero que ve cualquiera que entre al dominio.
 */

import { test, expect } from '@playwright/test';

test('la portada carga y lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/');

  // El titular es el mensaje del producto; si no está, no cargó la página
  // correcta aunque el servidor haya respondido 200.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('por fin ordenado');

  // Hay varios «Iniciar sesión» en la portada (cabecera, hero, cierre) y
  // todos deben llevar al mismo sitio. Se pulsa el primero, como haría alguien.
  await page.getByRole('link', { name: 'Iniciar sesión' }).first().click();

  await expect(page).toHaveURL(/\/login(\.html)?$/);
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
});
