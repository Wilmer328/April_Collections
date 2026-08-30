import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

/**
 * Guarda contra un fallo que ya ocurrió una vez.
 *
 * app.html usa atributos onclick/oninput en el HTML, y su script es un módulo,
 * que no comparte el ámbito global. Por eso hay un bloque
 * `Object.assign(window, {...})` que expone las funciones invocadas desde el
 * HTML. Ese bloque se mantiene a mano.
 *
 * Al añadir los buscadores se agregaron cuatro handlers nuevos y nadie
 * actualizó la lista: los controles quedaron mudos, sin error visible en la
 * página, y el fallo llegó hasta el navegador del cliente.
 *
 * Esta prueba compara ambas listas y falla si vuelven a separarse. Desaparece
 * en la Etapa 2, cuando ya no queden atributos inline.
 */

const rutaApp = fileURLToPath(new URL('../app.html', import.meta.url));
const html = readFileSync(rutaApp, 'utf8');

/** Nombres de función invocados desde atributos del HTML. */
function handlersEnLinea() {
  const encontrados = html.matchAll(/on(?:click|input|change|submit)="(\w+)\(/g);
  return [...new Set([...encontrados].map((m) => m[1]))].sort();
}

/** Nombres expuestos en el bloque Object.assign(window, {...}). */
function expuestasEnWindow() {
  const bloque = html.match(/Object\.assign\(window,\s*\{([\s\S]*?)\}\);/);

  if (!bloque) {
    return [];
  }

  return [...new Set(bloque[1].match(/\w+/g) ?? [])];
}

/** Nombres declarados como función dentro del script. */
function funcionesDeclaradas() {
  return new Set([...html.matchAll(/^function (\w+)/gm)].map((m) => m[1]));
}

describe('app.html — handlers en línea', () => {
  it('hay handlers que verificar', () => {
    expect(handlersEnLinea().length).toBeGreaterThan(0);
  });

  it('toda función invocada desde el HTML está expuesta en window', () => {
    const expuestas = new Set(expuestasEnWindow());
    const faltantes = handlersEnLinea().filter((nombre) => !expuestas.has(nombre));

    // Si esto falla, el control correspondiente no hace nada al pulsarlo:
    // agrega el nombre al bloque Object.assign(window, {...}) de app.html,
    // o conecta el evento con addEventListener y quita el atributo.
    expect(faltantes).toEqual([]);
  });

  it('toda función invocada desde el HTML existe en el script', () => {
    const declaradas = funcionesDeclaradas();
    const inexistentes = handlersEnLinea().filter((nombre) => !declaradas.has(nombre));

    expect(inexistentes).toEqual([]);
  });

  it('no se exponen en window funciones que ya nadie invoca desde el HTML', () => {
    const enLinea = new Set(handlersEnLinea());
    const sobrantes = expuestasEnWindow().filter((nombre) => !enLinea.has(nombre));

    expect(sobrantes).toEqual([]);
  });
});
