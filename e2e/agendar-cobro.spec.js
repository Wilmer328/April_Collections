/**
 * Agendar el cobro al registrar una venta fiada.
 *
 * Antes, registrar la venta y agendar su cobro eran dos tareas separadas por dos
 * pantallas: había que ir a Recordatorios y volver a buscar la clienta y la venta
 * recién registradas. En la práctica muchas ventas fiadas se quedaban sin
 * recordatorio, y una deuda sin recordatorio es una deuda que nadie va a cobrar.
 *
 * Estas pruebas recorren el flujo completo en un navegador real: vender a
 * crédito, ver la oferta, elegir un plazo y comprobar que el recordatorio sale
 * hacia el servidor con la fecha correcta.
 */

import { test, expect } from '@playwright/test';
import { NEGOCIO, entrarComoUsuaria, interceptarSupabase } from './ayudas/supabase-doble.js';

/** Lo que la aplicación envió a la tabla de recordatorios. */
function recordatoriosCreados(doble) {
  return doble.escrituras.filter((e) => e.metodo === 'POST' && e.tabla === 'recordatorios');
}

/**
 * Registra una venta desde la interfaz, como lo haría una persona.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'contado' | 'credito' | 'abono'} tipoPago
 */
async function registrarVenta(page, tipoPago) {
  await page.locator('.nav-btn[data-pagina="venta"]').click();

  // La clienta se elige escribiendo y pulsando en la sugerencia.
  await page.locator('#buscar-venta-cliente').fill('Ana');
  await page.locator('#sug-cliente [role="option"]').first().click();

  await page.locator('#venta-tipo-pago').selectOption(tipoPago);

  // El producto igual: buscador y sugerencia. La primera fila ya está puesta.
  await page.locator('#vbuscar-0').fill('Aretes');
  await page.locator('#vsug-0 [role="option"]').first().click();

  await page.getByRole('button', { name: 'Guardar venta' }).click();
}

test('tras vender a crédito se ofrece agendar el cobro', async ({ page }) => {
  const doble = await interceptarSupabase(page);
  await entrarComoUsuaria(page, doble.credenciales);
  await registrarVenta(page, 'credito');

  const modal = page.locator('#modal-agendar');
  await expect(modal).toBeVisible();

  // Dice a quién y cuánto: es lo que justifica agendar.
  await expect(modal).toContainText('Ana Martínez');
  await expect(modal).toContainText('queda debiendo');

  // Tres plazos de un toque, más la fecha exacta para cuando dijo un día concreto.
  await expect(modal.getByRole('button', { name: /En 1 semana/ })).toBeVisible();
  await expect(modal.getByRole('button', { name: /En 15 días/ })).toBeVisible();
  await expect(modal.getByRole('button', { name: /En 1 mes/ })).toBeVisible();
  await expect(modal.locator('#agendar-fecha')).toBeVisible();
});

test('elegir un plazo crea el recordatorio con la fecha correcta', async ({ page }) => {
  const doble = await interceptarSupabase(page);
  await entrarComoUsuaria(page, doble.credenciales);

  await registrarVenta(page, 'credito');
  const fechaVenta = await page.locator('#venta-fecha').inputValue();

  await page.locator('#modal-agendar').getByRole('button', { name: /En 1 semana/ }).click();
  await expect(page.locator('#modal-agendar')).not.toBeVisible();

  const creados = recordatoriosCreados(doble);
  expect(creados).toHaveLength(1);

  const recordatorio = creados[0].cuerpo;
  expect(recordatorio.negocio_id).toBe(NEGOCIO.id);
  expect(recordatorio.venta_id).toBeTruthy();
  expect(recordatorio.hora).toBe('09:00');

  // Siete días después de la venta, calculados en horario local. Si la fecha se
  // interpretara como UTC, en Honduras caería un día antes.
  const [anio, mes, dia] = fechaVenta.split('-').map(Number);
  const esperada = new Date(anio, mes - 1, dia + 7);
  const iso = [
    esperada.getFullYear(),
    String(esperada.getMonth() + 1).padStart(2, '0'),
    String(esperada.getDate()).padStart(2, '0'),
  ].join('-');

  expect(recordatorio.fecha).toBe(iso);
});

test('«Ahora no» cierra sin crear nada', async ({ page }) => {
  const doble = await interceptarSupabase(page);
  await entrarComoUsuaria(page, doble.credenciales);
  await registrarVenta(page, 'credito');

  await page.locator('#modal-agendar').getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.locator('#modal-agendar')).not.toBeVisible();

  // Agendar es opcional: rechazarlo no puede dejar un recordatorio a medias.
  expect(recordatoriosCreados(doble)).toHaveLength(0);
});

test('una venta al contado no ofrece agendar nada', async ({ page }) => {
  const doble = await interceptarSupabase(page);
  await entrarComoUsuaria(page, doble.credenciales);

  // Al contado se paga en el acto: no queda deuda que cobrar.
  await registrarVenta(page, 'contado');

  await expect(page.locator('#modal-agendar')).not.toBeVisible();
  expect(recordatoriosCreados(doble)).toHaveLength(0);
});
