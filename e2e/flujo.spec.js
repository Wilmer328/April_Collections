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

  // El negocio se muestra como etiqueta, no como desplegable: cada cuenta
  // pertenece a uno solo, asi que elegir no era una accion util. Informar si.
  await expect(page.locator('#etiqueta-negocio')).toHaveText(NEGOCIO.nombre);
  await expect(page.locator('#selector-negocio')).toHaveCount(0);
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

test('el modo demostración se distingue del negocio real', async ({ page }) => {
  // Quien enseña el producto tiene que ver de un vistazo que no está mirando
  // datos de clientas reales. Se comprueba con el negocio de demostración.
  const { credenciales } = await interceptarSupabase(page, {
    negocio: { id: 'n-demo', nombre: 'Demostracion' },
  });

  await entrarComoUsuaria(page, credenciales);

  const etiqueta = page.locator('#etiqueta-negocio');
  await expect(etiqueta).toHaveClass(/demo/);

  // Lleva dos rotulos y el CSS decide cual se ve segun el ancho: el largo en
  // pantalla amplia, «DEMO» en el telefono. Se comprueba el que se VE, no el
  // texto de ambos junto.
  await expect(etiqueta.locator('.negocio__largo')).toBeVisible();
  await expect(etiqueta.locator('.negocio__largo')).toHaveText('MODO DEMOSTRACIÓN');
  await expect(etiqueta.locator('.negocio__corto')).toBeHidden();
});

test('la cabecera nunca se desborda, a ningún ancho', async ({ page }) => {
  // El fallo original: en el teléfono el contenido de la cabecera no cabía, el
  // navegador ensanchaba el viewport para que entrara, y la barra oscura —que
  // mide lo que el body— dejaba de llegar al borde. Se veía como una franja
  // blanca junto a «Salir».
  //
  // Se prueban varios anchos y no uno solo porque la primera corrección hacía
  // que cupiera por menos de un píxel a 390px: pasaba en Windows y fallaba en
  // Linux, donde las tipografías miden algo distinto. Un margen de un píxel no
  // es que quepa, es que todavía no se ha roto.
  const ANCHOS = [320, 375, 412, 480, 560, 768, 1280];

  const { credenciales } = await interceptarSupabase(page, {
    negocio: { id: 'n-demo', nombre: 'Demostracion' },
  });

  await entrarComoUsuaria(page, credenciales);

  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 800 });

    const medidas = await page.evaluate(() => {
      // `clientWidth` y no `innerWidth`: el segundo incluye la barra de
      // desplazamiento, que en Linux ocupa unos 15px y en Windows ninguno.
      const disponible = document.documentElement.clientWidth;

      return {
        desborda: document.documentElement.scrollWidth > disponible,
        cabecera: document.querySelector('.app-header').scrollWidth,
        disponible,
      };
    });

    expect(medidas.desborda, `se desborda a ${ancho}px`).toBe(false);
    expect(medidas.cabecera, `la cabecera no cabe a ${ancho}px`)
      .toBeLessThanOrEqual(medidas.disponible);
  }
});

test('en el teléfono el aviso de demostración no se sacrifica por espacio', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });

  const { credenciales } = await interceptarSupabase(page, {
    negocio: { id: 'n-demo', nombre: 'Demostracion' },
  });

  await entrarComoUsuaria(page, credenciales);

  // El rótulo se abrevia, pero sigue ahí: confundir datos inventados con datos
  // de clientas reales es el error que más caro sale.
  const etiqueta = page.locator('#etiqueta-negocio');
  await expect(etiqueta.locator('.negocio__corto')).toBeVisible();
  await expect(etiqueta.locator('.negocio__corto')).toHaveText('DEMO');
  await expect(etiqueta.locator('.negocio__largo')).toBeHidden();

  // Y salir de la sesión tiene que poder pulsarse siempre.
  await expect(page.locator('#btn-salir')).toBeVisible();
});
