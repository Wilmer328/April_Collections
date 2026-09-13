/**
 * Toda fila que se guarda tiene que llevar `negocio_id`.
 *
 * No es un detalle: la columna es NOT NULL y las políticas RLS comprueban la
 * pertenencia contra ella. Una inserción sin negocio la rechaza la base.
 *
 * Esta prueba existe porque el fallo YA OCURRIÓ. Al migrar al modelo de
 * negocios se actualizaron los seis sitios que insertan... menos
 * `asegurarIniciales()`, que solo se ejecuta cuando una cuenta entra por
 * primera vez con el catálogo vacío. Nadie lo notó hasta que la dueña estrenó
 * su cuenta y la aplicación no cargó.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearSupabaseFalso, llamadasA, cargaDe, memoriaLocal } from './ayudas/supabase-falso.js';

const { estado } = vi.hoisted(() => ({ estado: { cliente: null } }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getSupabaseClient: async () => estado.cliente,
}));

const NEGOCIO = { id: 'n-april', nombre: 'April Collections', rol: 'propietaria' };

/**
 * Carga los repositorios de cero y deja un negocio activo, que es el estado
 * normal de la aplicación una vez iniciada la sesión.
 */
async function conNegocioActivo() {
  vi.resetModules();

  const negocios = await import('../src/data/repositories/negocios.js');
  negocios.fijarActivo(NEGOCIO, 'usuario-1');

  return {
    negocios,
    categorias: await import('../src/data/repositories/categorias.js'),
    clientes: await import('../src/data/repositories/clientes.js'),
    productos: await import('../src/data/repositories/productos.js'),
    recordatorios: await import('../src/data/repositories/recordatorios.js'),
    ventas: await import('../src/data/repositories/ventas.js'),
  };
}

beforeEach(() => {
  globalThis.localStorage = memoriaLocal();
  estado.cliente = crearSupabaseFalso({
    respuestas: {
      clientes: { data: { id: 'c-1', nombre: 'Ana' }, error: null },
      productos: { data: { id: 'p-1', nombre: 'Anillo', stock: 3 }, error: null },
      categorias: { data: { nombre: 'Joyeria' }, error: null },
      recordatorios: {
        data: { id: 'r-1', fecha: '2026-03-04', hora: '09:00:00', estado: 'pendiente' },
        error: null,
      },
      ventas: {
        data: { id: 'v-1', cliente_id: 'c-1', fecha: '2026-03-04', tipo_pago: 'credito' },
        error: null,
      },
    },
  });
});

describe('cada inserción lleva negocio_id', () => {
  it('al registrar una clienta', async () => {
    const { clientes } = await conNegocioActivo();
    await clientes.crear({ nombre: 'Ana' });

    expect(cargaDe(llamadasA(estado.cliente, 'clientes')[0]).negocio_id).toBe('n-april');
  });

  it('al agregar un producto', async () => {
    const { productos } = await conNegocioActivo();
    await productos.crear({ nombre: 'Anillo', categoria: 'Joyeria' });

    expect(cargaDe(llamadasA(estado.cliente, 'productos')[0]).negocio_id).toBe('n-april');
  });

  it('al crear una categoría', async () => {
    const { categorias } = await conNegocioActivo();
    await categorias.crear('Perfumes');

    expect(cargaDe(llamadasA(estado.cliente, 'categorias')[0]).negocio_id).toBe('n-april');
  });

  it('al agendar un recordatorio', async () => {
    const { recordatorios } = await conNegocioActivo();
    await recordatorios.crear({ clienteId: 'c-1', fecha: '2026-03-04' });

    expect(cargaDe(llamadasA(estado.cliente, 'recordatorios')[0]).negocio_id).toBe('n-april');
  });

  it('al registrar una venta', async () => {
    const { ventas } = await conNegocioActivo();
    await ventas.crear({
      clienteId: 'c-1',
      fecha: '2026-03-04',
      tipoPago: 'credito',
      items: [{ productoId: 'p-1', nombre: 'Anillo', precio: 100, costo: 60, qty: 1 }],
    });

    expect(cargaDe(llamadasA(estado.cliente, 'ventas')[0]).negocio_id).toBe('n-april');
  });

  it('al sembrar las categorías iniciales de una cuenta nueva', async () => {
    // El caso que se escapó: solo ocurre con el catálogo vacío.
    estado.cliente = crearSupabaseFalso({ respuestas: { categorias: { data: [], error: null } } });

    const { categorias } = await conNegocioActivo();
    await categorias.asegurarIniciales();

    const insercion = llamadasA(estado.cliente, 'categorias').find((l) => cargaDe(l));
    const filas = cargaDe(insercion);

    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.negocio_id).toBe('n-april');
    }
  });

  it('no vuelve a sembrarlas si ya hay categorías', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: { categorias: { data: [{ nombre: 'Joyeria' }], error: null } },
    });

    const { categorias } = await conNegocioActivo();

    expect(await categorias.asegurarIniciales()).toEqual(['Joyeria']);
    expect(llamadasA(estado.cliente, 'categorias').filter((l) => cargaDe(l))).toHaveLength(0);
  });
});

describe('sin negocio activo', () => {
  it('se niega a guardar en lugar de mandar la fila sin negocio', async () => {
    vi.resetModules();
    const clientes = await import('../src/data/repositories/clientes.js');

    // Enviar negocio_id nulo lo rechazaría la base igualmente, pero con un
    // mensaje de Postgres que no dice nada a quien usa la aplicación.
    await expect(clientes.crear({ nombre: 'Ana' })).rejects.toThrow(/identificar el negocio/);
  });
});

describe('conversión de dinero al guardar', () => {
  it('manda centavos enteros, nunca lempiras', async () => {
    const { productos } = await conNegocioActivo();
    await productos.crear({ nombre: 'Anillo', categoria: 'Joyeria', costo: 60.5, precio: 149.99 });

    const enviado = cargaDe(llamadasA(estado.cliente, 'productos')[0]);

    expect(enviado.costo_centavos).toBe(6050);
    expect(enviado.precio_centavos).toBe(14999);
  });

  it('nunca guarda existencias negativas ni fraccionarias', async () => {
    const { productos } = await conNegocioActivo();

    await productos.crear({ nombre: 'A', categoria: 'X', stock: -5 });
    expect(cargaDe(llamadasA(estado.cliente, 'productos')[0]).stock).toBe(0);

    await productos.crear({ nombre: 'B', categoria: 'X', stock: 3.9 });
    expect(cargaDe(llamadasA(estado.cliente, 'productos')[1]).stock).toBe(3);
  });
});

describe('cadenas vacías que deben ser null', () => {
  it('el DNI y el teléfono en blanco van como null', async () => {
    const { clientes } = await conNegocioActivo();
    await clientes.crear({ nombre: '  Ana  ', dni: '   ', tel: '' });

    const enviado = cargaDe(llamadasA(estado.cliente, 'clientes')[0]);

    // El índice único de DNI es parcial: con '' todas las clientas sin DNI
    // chocarían entre sí.
    expect(enviado.dni).toBeNull();
    expect(enviado.telefono).toBeNull();
    expect(enviado.nombre).toBe('Ana');
  });
});

describe('una venta que falla a medias', () => {
  it('borra la cabecera para no dejar una venta sin productos', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        ventas: { data: { id: 'v-1' }, error: null },
        venta_items: { data: null, error: { message: 'violates row-level security' } },
      },
    });

    const { ventas } = await conNegocioActivo();

    await expect(
      ventas.crear({
        clienteId: 'c-1',
        fecha: '2026-03-04',
        tipoPago: 'contado',
        items: [{ productoId: 'p-1', nombre: 'Anillo', precio: 100, costo: 60, qty: 1 }],
      }),
    ).rejects.toThrow(/productos de la venta/);

    const borrado = llamadasA(estado.cliente, 'ventas').find((l) =>
      l.metodos.some((m) => m.nombre === 'delete'),
    );

    expect(borrado).toBeDefined();
  });
});
