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

/** Fecha en formato ISO local, desplazada respecto a hoy. */
function fechaRelativa(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Un recordatorio pendiente para la clienta del doble. */
function recordatorio(id, dias) {
  return {
    id,
    cliente_id: 'cli-1',
    venta_id: 'ven-1',
    fecha: fechaRelativa(dias),
    hora: '09:00',
    nota: null,
    estado: 'pendiente',
    avisado_en: null,
    visto: false,
  };
}

test('los cobros vencidos encabezan la pantalla, del más antiguo primero', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [
      recordatorio('r-ayer', -1),
      recordatorio('r-viejo', -21),
      recordatorio('r-manana', 1),
    ],
  });

  await entrarComoUsuaria(page, credenciales);
  await irARecordatorios(page);

  const franja = page.locator('#rec-alertas-vencidos');
  await expect(franja).toContainText('2 cobros vencidos');

  // El de hace tres semanas pesa más: va primero.
  await expect(franja).toContainText('21 días de retraso');
  await expect(franja).toContainText('1 día de retraso');

  const texto = await franja.textContent();
  expect(texto.indexOf('21 días')).toBeLessThan(texto.indexOf('1 día de retraso'));

  // El de mañana todavía no vence y no aparece aquí.
  await expect(franja).not.toContainText('mañana');
});

test('el contador de la pestaña cuenta los vencidos, no solo los de hoy', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [
      recordatorio('r-1', -5),
      recordatorio('r-2', -2),
      recordatorio('r-hoy', 0),
      recordatorio('r-futuro', 3),
    ],
  });

  await entrarComoUsuaria(page, credenciales);

  // Dos vencidos más el de hoy. El futuro no cuenta: aún no toca.
  await expect(page.locator('#notif-badge')).toHaveText('3');
});

test('sin cobros vencidos no aparece la franja', async ({ page }) => {
  const { credenciales } = await interceptarSupabase(page, {
    recordatorios: [recordatorio('r-futuro', 5)],
  });

  await entrarComoUsuaria(page, credenciales);
  await irARecordatorios(page);

  await expect(page.locator('#rec-alertas-vencidos')).toBeEmpty();
});

test('aplazar un cobro lo mueve desde hoy, no desde la fecha vencida', async ({ page }) => {
  const doble = await interceptarSupabase(page, {
    recordatorios: [recordatorio('r-viejo', -30)],
  });

  await entrarComoUsuaria(page, credencialesDe(doble));
  await irARecordatorios(page);

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
  expect(envio.cuerpo.fecha).toBe(fechaRelativa(7));

  // Y deja de estar vencido: la franja desaparece.
  await expect(page.locator('#rec-alertas-vencidos')).toBeEmpty();
});

/** Atajo para leer las credenciales del doble. */
function credencialesDe(doble) {
  return doble.credenciales;
}

/**
 * Abre la pestaña de recordatorios.
 *
 * Con cobros vencidos la aplicación lanza su aviso emergente. Ya no tapa la
 * barra de pestañas —se corrigió al escribir estas pruebas, porque impedía
 * navegar mientras estuviera abierto— así que basta con pulsar la pestaña.
 */
async function irARecordatorios(page) {
  await page.locator('.nav-btn[data-pagina="recordatorios"]').click();
}
