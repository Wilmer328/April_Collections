/**
 * Actualizaciones parciales y borrados.
 *
 * `actualizar()` arma el parche campo a campo, incluyendo solo lo que se pidió
 * cambiar. La distinción importa: mandar `undefined` y mandar `null` no son lo
 * mismo para PostgREST, y confundirlos borra datos que nadie pidió borrar.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearSupabaseFalso, llamadasA, cargaDe, memoriaLocal } from './ayudas/supabase-falso.js';

const { estado } = vi.hoisted(() => ({ estado: { cliente: null } }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getSupabaseClient: async () => estado.cliente,
}));

/** Lo que se envió en un `update`, y el `eq` con que se filtró. */
function parcheDe(tabla) {
  const llamada = llamadasA(estado.cliente, tabla).find((l) =>
    l.metodos.some((m) => m.nombre === 'update'),
  );

  return {
    campos: cargaDe(llamada, 'update'),
    filtro: llamada?.metodos.find((m) => m.nombre === 'eq')?.args,
  };
}

async function cargarRepos() {
  vi.resetModules();

  const negocios = await import('../src/data/repositories/negocios.js');
  negocios.fijarActivo({ id: 'n-april', nombre: 'April Collections', rol: 'propietaria' }, 'u-1');

  return {
    clientes: await import('../src/data/repositories/clientes.js'),
    productos: await import('../src/data/repositories/productos.js'),
    recordatorios: await import('../src/data/repositories/recordatorios.js'),
    ventas: await import('../src/data/repositories/ventas.js'),
    categorias: await import('../src/data/repositories/categorias.js'),
  };
}

beforeEach(() => {
  globalThis.localStorage = memoriaLocal();
  estado.cliente = crearSupabaseFalso({
    respuestas: {
      clientes: { data: { id: 'c-1', nombre: 'Ana', dni: null, telefono: null }, error: null },
      productos: {
        data: { id: 'p-1', nombre: 'Anillo', categoria: 'Joyeria', costo_centavos: 0, precio_centavos: 0, stock: 0 },
        error: null,
      },
      recordatorios: {
        data: { id: 'r-1', cliente_id: 'c-1', fecha: '2026-03-04', hora: '09:00:00', estado: 'pendiente' },
        error: null,
      },
    },
  });
});

describe('actualizaciones parciales', () => {
  it('solo manda los campos que se pidieron cambiar', async () => {
    const { clientes } = await cargarRepos();
    await clientes.actualizar('c-1', { nombre: 'Ana María' });

    const { campos, filtro } = parcheDe('clientes');

    // Si el parche llevara dni y telefono en undefined, se borrarían datos que
    // nadie toco.
    expect(Object.keys(campos)).toEqual(['nombre']);
    expect(campos.nombre).toBe('Ana María');
    expect(filtro).toEqual(['id', 'c-1']);
  });

  it('un campo vaciado a propósito sí llega, como null', async () => {
    const { clientes } = await cargarRepos();
    await clientes.actualizar('c-1', { dni: '', tel: '  ' });

    const { campos } = parcheDe('clientes');

    expect(campos.dni).toBeNull();
    expect(campos.telefono).toBeNull();
    expect('nombre' in campos).toBe(false);
  });

  it('convierte a centavos al corregir un precio', async () => {
    const { productos } = await cargarRepos();
    await productos.actualizar('p-1', { precio: 199.95 });

    expect(parcheDe('productos').campos).toEqual({ precio_centavos: 19995 });
  });

  it('sigue sin admitir existencias negativas al corregirlas', async () => {
    const { productos } = await cargarRepos();
    await productos.actualizar('p-1', { stock: -3 });

    expect(parcheDe('productos').campos.stock).toBe(0);
  });

  it('fijarStock cambia las existencias y nada más', async () => {
    const { productos } = await cargarRepos();
    await productos.fijarStock('p-1', 7);

    expect(parcheDe('productos').campos).toEqual({ stock: 7 });
  });

  it('marcar un recordatorio como visto no toca su fecha', async () => {
    const { recordatorios } = await cargarRepos();
    await recordatorios.actualizar('r-1', { visto: true, avisadoEn: '2026-03-04T09:00:00Z' });

    const { campos } = parcheDe('recordatorios');

    expect(campos).toEqual({ visto: true, avisado_en: '2026-03-04T09:00:00Z' });
  });

  it('una nota en blanco se guarda como null', async () => {
    const { recordatorios } = await cargarRepos();
    await recordatorios.actualizar('r-1', { nota: '   ' });

    expect(parcheDe('recordatorios').campos).toEqual({ nota: null });
  });
});

describe('cerrar recordatorios al saldarse una venta', () => {
  it('solo cierra los pendientes de esa venta', async () => {
    const { recordatorios } = await cargarRepos();
    await recordatorios.completarPorVenta('v-1');

    const llamada = llamadasA(estado.cliente, 'recordatorios')[0];
    const filtros = llamada.metodos.filter((m) => m.nombre === 'eq').map((m) => m.args);

    expect(cargaDe(llamada, 'update')).toEqual({ estado: 'completado' });
    // Sin el segundo filtro se reabrirían como completados los ya cancelados.
    expect(filtros).toEqual([['venta_id', 'v-1'], ['estado', 'pendiente']]);
  });
});

describe('abonos', () => {
  it('registra el monto en centavos contra la venta', async () => {
    const { ventas } = await cargarRepos();
    await ventas.registrarAbono('v-1', 250.75, '2026-03-04');

    expect(cargaDe(llamadasA(estado.cliente, 'abonos')[0])).toEqual({
      venta_id: 'v-1',
      monto_centavos: 25075,
      fecha: '2026-03-04',
    });
  });
});

describe('borrados', () => {
  it.each([
    ['clientes', async (r) => r.clientes.eliminar('c-1')],
    ['productos', async (r) => r.productos.eliminar('p-1')],
    ['ventas', async (r) => r.ventas.eliminar('v-1')],
    ['recordatorios', async (r) => r.recordatorios.eliminar('r-1')],
  ])('%s borra filtrando por id', async (tabla, ejecutar) => {
    const repos = await cargarRepos();
    await ejecutar(repos);

    const llamada = llamadasA(estado.cliente, tabla)[0];

    expect(llamada.metodos.some((m) => m.nombre === 'delete')).toBe(true);
    expect(llamada.metodos.find((m) => m.nombre === 'eq').args[0]).toBe('id');
  });

  it('una categoría se borra por su nombre, que es como la maneja la interfaz', async () => {
    const { categorias } = await cargarRepos();
    await categorias.eliminar('Perfumes');

    const llamada = llamadasA(estado.cliente, 'categorias')[0];

    expect(llamada.metodos.find((m) => m.nombre === 'eq').args).toEqual(['nombre', 'Perfumes']);
  });

  it('avisa si la base rechaza el borrado por tener ventas', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        clientes: { data: null, error: { message: 'violates foreign key constraint', code: '23503' } },
      },
    });

    const { clientes } = await cargarRepos();

    // La clave foránea es RESTRICT a propósito: borrar una clienta con ventas
    // dejaría el historial de cobros huérfano.
    await expect(clientes.eliminar('c-1')).rejects.toThrow(/eliminar la clienta/);
  });
});
