/**
 * Los cobros vencidos reclaman atención.
 *
 * Antes, un recordatorio cuya fecha ya había pasado solo llevaba una etiqueta
 * gris perdida en la lista: una deuda de hace tres semanas se veía igual que una
 * de mañana. Y el contador de la pestaña solo contaba los del día, así que quien
 * no abría la aplicación una jornada lo veía en cero al siguiente aunque tuviera
 * cobros sin atender.
 *
 * Estas pruebas comprueban lo contrario en un navegador real: que lo vencido
 * encabeza la pantalla, que el contador no se vacía solo, y que aplazar un cobro
 * es un toque.
 */

import { test, expect } from '@playwright/test';
import { entrarComoUsuaria, interceptarSupabase } from './ayudas/supabase-doble.js';

/**
 * Fecha ISO desplazada respecto a hoy, EN LA ZONA HORARIA DEL NAVEGADOR.
 *
 * No se calcula con el `new Date()` de Node: el proceso de pruebas corre en la
 * zona del sistema —UTC en el runner de integración continua— mientras el
 * navegador usa la de Honduras, fijada en `playwright.config.js`. Entre
 * medianoche y las seis de la mañana UTC las dos zonas están en días distintos,
 * y una prueba que sembrara «hoy» según Node y lo comprobara contra el «hoy» de
 * la aplicación fallaría sola de madrugada, sin que nadie hubiera tocado nada.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} dias
 * @returns {Promise<string>}
 */
function fechaRelativa(page, dias) {
  return page.evaluate((n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  }, dias);
}

/** Un recordatorio pendiente para la clienta del doble, en la fecha dada. */
function recordatorio(id, fecha) {
  return {
    id,
    cliente_id: 'cli-1',
    venta_id: 'ven-1',
    fecha,
    hora: '09:00',
    nota: null,
    estado: 'pendiente',
    avisado_en: null,
    visto: false,
  };
}

test('los cobros vencidos encabezan la pantalla, del más antiguo primero', async ({ page }) => {
  const [ayer, viejo, manana] = await Promise.all([
    fechaRelativa(page, -1),
    fechaRelativa(page, -21),
    fechaRelativa(page, 1),
  ]);

  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [
      recordatorio('r-ayer', ayer),
      recordatorio('r-viejo', viejo),
      recordatorio('r-manana', manana),
    ],
  });

  await entrarComoUsuaria(page, credenciales);
  await page.locator('.nav-btn[data-pagina="recordatorios"]').click();

  const franja = page.locator('#rec-alertas-vencidos');
  await expect(franja).toContainText('2 cobros vencidos');

  // El de hace tres semanas pesa más: va primero.
  await expect(franja).toContainText('21 días de retraso');
  await expect(franja).toContainText('1 día de retraso');

  const texto = await franja.textContent();
  expect(texto.indexOf('21 días')).toBeLessThan(texto.indexOf('1 día de retraso'));

  // El de mañana todavía no vence y no aparece aquí.
  await expect(franja).not.toContainText(manana);
});

test('el contador de la pestaña cuenta los vencidos, no solo los de hoy', async ({ page }) => {
  const [hace5, hace2, hoy, futuro] = await Promise.all([
    fechaRelativa(page, -5),
    fechaRelativa(page, -2),
    fechaRelativa(page, 0),
    fechaRelativa(page, 3),
  ]);

  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [
      recordatorio('r-1', hace5),
      recordatorio('r-2', hace2),
      recordatorio('r-hoy', hoy),
      recordatorio('r-futuro', futuro),
    ],
  });

  await entrarComoUsuaria(page, credenciales);

  // Dos vencidos más el de hoy. El futuro no cuenta: aún no toca.
  await expect(page.locator('#notif-badge')).toHaveText('3');
});

test('sin cobros vencidos no aparece la franja', async ({ page }) => {
  const futuro = await fechaRelativa(page, 5);

  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [recordatorio('r-futuro', futuro)],
  });

  await entrarComoUsuaria(page, credenciales);
  await page.locator('.nav-btn[data-pagina="recordatorios"]').click();

  await expect(page.locator('#rec-alertas-vencidos')).toBeEmpty();
});

test('aplazar un cobro lo mueve desde hoy, no desde la fecha vencida', async ({ page }) => {
  const [hace30, enUnaSemana] = await Promise.all([
    fechaRelativa(page, -30),
    fechaRelativa(page, 7),
  ]);

  const doble = await interceptarSupabase(page, {
    recordatorios: [recordatorio('r-viejo', hace30)],
  });

  await entrarComoUsuaria(page, doble.credenciales);
  await page.locator('.nav-btn[data-pagina="recordatorios"]').click();

  await page.locator('#rec-alertas-vencidos').getByRole('button', { name: '+1 sem' }).click();

  // La aplicación emite otros PATCH sobre la misma tabla al mostrar su aviso
  // —marca `avisado_en` y `visto`—, así que hay que buscar el que cambia la
  // fecha y no quedarse con el primero.
  const envio = doble.escrituras.find(
    (e) => e.metodo === 'PATCH' && e.tabla === 'recordatorios' && e.cuerpo?.fecha,
  );
  expect(envio).toBeDefined();

  // Una semana desde HOY. Sumar sobre la fecha vencida lo dejaría tres semanas
  // en el pasado, es decir, seguiría vencido.
  expect(envio.cuerpo.fecha).toBe(enUnaSemana);

  // Y deja de estar vencido: la franja desaparece.
  await expect(page.locator('#rec-alertas-vencidos')).toBeEmpty();
});
