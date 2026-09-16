/**
 * Control de acceso visto desde el navegador.
 *
 * La barrera real son las políticas RLS en PostgreSQL; esto comprueba la
 * primera línea, que es la que ve una persona: sin sesión no se entra.
 */

import { test, expect } from '@playwright/test';
import { interceptarSupabase } from './ayudas/supabase-doble.js';

test('la aplicación sin sesión expulsa al inicio de sesión', async ({ page }) => {
  await interceptarSupabase(page);

  // Un contexto nuevo no tiene sesión guardada: es exactamente alguien que
  // abre /app por primera vez, o cuya sesión caducó.
  await page.goto('/app.html#clientes');

  await expect(page).toHaveURL(/\/login(\.html)?$/);

  // Se recuerda a dónde iba, para devolverle allí tras entrar. Sin esto,
  // quien abre /app#clientes acaba en Inicio y tiene que buscar la pantalla.
  const destino = await page.evaluate(() => sessionStorage.getItem('ac_destino'));
  expect(destino).toContain('#clientes');
});

test('una contraseña incorrecta no entra y lo dice', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page);

  await page.goto('/login.html');
  await page.getByLabel('Correo').fill(credenciales.correo);
  await page.getByLabel('Contraseña').fill('esta-no-es');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Sigue en el login, con un mensaje que no distingue si falló el correo o
  // la contraseña: distinguirlo permitiría averiguar qué correos tienen cuenta.
  await expect(page).toHaveURL(/\/login(\.html)?$/);
  await expect(page.getByText('Correo o contraseña incorrectos')).toBeVisible();
});
