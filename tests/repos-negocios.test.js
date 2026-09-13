/**
 * El negocio activo decide de dónde salen los datos y a dónde van.
 *
 * Si esta elección falla, no aparece ningún error: la aplicación enseña los
 * datos de otro negocio, o guarda en el equivocado. Es exactamente el fallo
 * que motivó el ADR-0004, así que conviene tenerlo sujeto por pruebas.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearSupabaseFalso, memoriaLocal } from './ayudas/supabase-falso.js';

const { estado } = vi.hoisted(() => ({ estado: { cliente: null } }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getSupabaseClient: async () => estado.cliente,
}));

/** Módulo recién cargado: `negocios.js` guarda el activo en una variable. */
async function cargarNegocios() {
  vi.resetModules();
  return import('../src/data/repositories/negocios.js');
}

const APRIL = { id: 'n-april', nombre: 'April Collections', rol: 'propietaria' };
const DEMO = { id: 'n-demo', nombre: 'Demostracion', rol: 'lector' };

beforeEach(() => {
  globalThis.localStorage = memoriaLocal();
  estado.cliente = crearSupabaseFalso();
});

describe('listarMios', () => {
  it('aplana la membresía y el negocio en un solo objeto', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        miembros: {
          data: [
            { rol: 'propietaria', negocios: { id: 'n-april', nombre: 'April Collections' } },
            { rol: 'lector', negocios: { id: 'n-demo', nombre: 'Demostracion' } },
          ],
          error: null,
        },
      },
    });

    const negocios = await cargarNegocios();

    expect(await negocios.listarMios()).toEqual([
      { id: 'n-april', nombre: 'April Collections', rol: 'propietaria' },
      { id: 'n-demo', nombre: 'Demostracion', rol: 'lector' },
    ]);
  });

  it('descarta membresías cuyo negocio no vino', async () => {
    // Pasa si RLS deja ver la membresía pero no el negocio. Sin el filtro, la
    // aplicación reventaría al leer `fila.negocios.id`.
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        miembros: {
          data: [
            { rol: 'lector', negocios: null },
            { rol: 'propietaria', negocios: { id: 'n-april', nombre: 'April Collections' } },
          ],
          error: null,
        },
      },
    });

    const negocios = await cargarNegocios();
    const resultado = await negocios.listarMios();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('n-april');
  });

  it('lanza un error con contexto si la consulta falla', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: { miembros: { data: null, error: { message: 'permission denied' } } },
    });

    const negocios = await cargarNegocios();

    await expect(negocios.listarMios()).rejects.toThrow(/cargar tus negocios/);
  });
});

describe('elegirInicial', () => {
  it('devuelve null si no pertenece a ninguno', async () => {
    const negocios = await cargarNegocios();

    expect(negocios.elegirInicial([], 'usuario-1')).toBeNull();
    expect(negocios.obtenerActivo()).toBeNull();
  });

  it('toma el primero la primera vez', async () => {
    const negocios = await cargarNegocios();

    expect(negocios.elegirInicial([APRIL, DEMO], 'usuario-1')).toEqual(APRIL);
  });

  it('recuerda el elegido la última vez', async () => {
    const negocios = await cargarNegocios();

    negocios.elegirInicial([APRIL, DEMO], 'usuario-1');
    negocios.fijarActivo(DEMO, 'usuario-1');

    const otraVisita = await cargarNegocios();

    expect(otraVisita.elegirInicial([APRIL, DEMO], 'usuario-1').id).toBe('n-demo');
  });

  it('no recuerda el de otra persona', async () => {
    const negocios = await cargarNegocios();
    negocios.fijarActivo(DEMO, 'usuario-1');

    const otra = await cargarNegocios();

    // La clave lleva el usuario dentro: quien entra después no hereda la
    // eleccion de quien uso el mismo navegador antes.
    expect(otra.elegirInicial([APRIL, DEMO], 'usuario-2').id).toBe('n-april');
  });

  it('cae al primero si le retiraron el acceso al recordado', async () => {
    const negocios = await cargarNegocios();
    negocios.fijarActivo(DEMO, 'usuario-1');

    const despues = await cargarNegocios();

    // Ya no aparece Demostracion entre los disponibles.
    expect(despues.elegirInicial([APRIL], 'usuario-1').id).toBe('n-april');
  });

  it('funciona aunque el navegador no deje guardar nada', async () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
    };

    const negocios = await cargarNegocios();

    // Se pierde la comodidad de recordar, no el acceso.
    expect(negocios.elegirInicial([APRIL, DEMO], 'usuario-1')).toEqual(APRIL);
  });
});

describe('puedeEscribir', () => {
  it.each([
    ['propietaria', true],
    ['administrador', true],
    ['lector', false],
  ])('con rol %s devuelve %s', async (rol, esperado) => {
    const negocios = await cargarNegocios();
    negocios.fijarActivo({ id: 'n-1', nombre: 'X', rol }, 'usuario-1');

    expect(negocios.puedeEscribir()).toBe(esperado);
  });

  it('es falso si todavía no se eligió negocio', async () => {
    const negocios = await cargarNegocios();

    expect(negocios.puedeEscribir()).toBe(false);
  });
});
