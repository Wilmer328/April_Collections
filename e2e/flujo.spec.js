/**
 * El recorrido que hace la dueña cada día, de principio a fin.
 *
 * Es la cima de la pirámide: un navegador real, la aplicación compilada de
 * producción, y una persona —Playwright— que escribe, pulsa y mira. Lo único
 * que no es real es el servidor de Supabase, interceptado en la red.
 */

import { test, expect } from '@playwright/test';
import { interceptarSupabase, entrarComoUsuaria, NEGOCIO, USUARIA } from './ayudas/supabase-doble.js';

test('entra con correo y contraseña y llega a la aplicación', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page);

  await entrarComoUsuaria(page, credenciales);

  // Dentro: se ve quién es y a qué negocio pertenece. Si el negocio no
  // apareciera, RLS no devolvería ninguna fila y la pantalla saldría vacía
  // sin explicar por qué.
  //
  // La cabecera muestra el CORREO, no el nombre, a propósito: identifica la
  // cuenta sin ambigüedad, y dos personas pueden llamarse igual. El nombre
  // solo aporta la inicial del avatar cuando no hay foto.
  await expect(page.locator('#sesion-nombre')).toHaveText(USUARIA.email);
  await expect(page.locator('#sesion-inicial')).toHaveText(USUARIA.nombre.charAt(0));
  await expect(page.locator('#etiqueta-negocio')).toHaveText(NEGOCIO.nombre);
});

test('ve las clientas del negocio y quién debe', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page);
  await entrarComoUsuaria(page, credenciales);

  await page.locator('.nav-btn[data-pagina="clientes"]').click();

  const lista = page.locator('#lista-clientes');
  await expect(lista).toContainText('Ana Martínez');
  await expect(lista).toContainText('Rosa Pineda');

  // Ana compró por 150 y abonó 50: debe 100. El saldo no viene del servidor,
  // se calcula en el navegador a partir de las líneas y los abonos. Que
  // aparezca aquí prueba que el cálculo y el pintado están bien unidos.
  const ana = lista.locator('.list-item', { hasText: 'Ana Martínez' });
  await expect(ana).toContainText('Debe');
  await expect(ana).toContainText('100');

  // Rosa no ha comprado nada: al día.
  const rosa = lista.locator('.list-item', { hasText: 'Rosa Pineda' });
  await expect(rosa).toContainText('Al día');
});

test('registra una clienta nueva y la envía al servidor con su negocio', async ({ page }) => {
  const { credenciales, escrituras } = await interceptarSupabase(page);
  await entrarComoUsuaria(page, credenciales);

  await page.locator('.nav-btn[data-pagina="clientes"]').click();

  await page.getByLabel('Nombre completo').fill('Carmen López');
  await page.getByLabel('Teléfono (opcional)').fill('9999-0003');
  await page.getByRole('button', { name: 'Agregar cliente(a)' }).click();

  // 1. Aparece en la lista, arriba, porque es la más reciente.
  const lista = page.locator('#lista-clientes');
  await expect(lista.locator('.list-item').first()).toContainText('Carmen López');

  // 2. El formulario queda limpio para la siguiente.
  await expect(page.getByLabel('Nombre completo')).toHaveValue('');

  // 3. Y lo importante: se ENVIÓ al servidor, con el negocio al que
  //    pertenece. Sin negocio_id la base la rechazaría, y esa fue justamente
  //    la clase de fallo que dejó a la dueña sin poder entrar una vez.
  const envio = escrituras.find((e) => e.metodo === 'POST' && e.tabla === 'clientes');
  expect(envio).toBeDefined();
  expect(envio.cuerpo).toMatchObject({
    nombre: 'Carmen López',
    telefono: '9999-0003',
    negocio_id: NEGOCIO.id,
  });
});
