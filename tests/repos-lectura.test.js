/**
 * Traducción de la base a la aplicación.
 *
 * Los repositorios no tienen reglas de negocio, pero sí una responsabilidad
 * que se rompe sin hacer ruido: pasar de `snake_case` y centavos a `camelCase`
 * y lempiras. Un error aquí no lanza ninguna excepción; enseña un precio mal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crearSupabaseFalso, memoriaLocal } from './ayudas/supabase-falso.js';

const { estado } = vi.hoisted(() => ({ estado: { cliente: null } }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getSupabaseClient: async () => estado.cliente,
}));

async function cargarRepos() {
  vi.resetModules();

  const negocios = await import('../src/data/repositories/negocios.js');
  negocios.fijarActivo({ id: 'n-april', nombre: 'April Collections', rol: 'propietaria' }, 'u-1');

  return {
    clientes: await import('../src/data/repositories/clientes.js'),
    productos: await import('../src/data/repositories/productos.js'),
    ventas: await import('../src/data/repositories/ventas.js'),
    recordatorios: await import('../src/data/repositories/recordatorios.js'),
    categorias: await import('../src/data/repositories/categorias.js'),
  };
}

beforeEach(() => {
  globalThis.localStorage = memoriaLocal();
});

describe('clientas', () => {
  it('renombra telefono a tel y convierte los nulos en cadena vacía', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        clientes: {
          data: [{ id: 'c-1', nombre: 'Ana', dni: null, telefono: null }],
          error: null,
        },
      },
    });

    const { clientes } = await cargarRepos();

    // La interfaz pinta estos valores en campos de texto: un null se vería
    // como la palabra "null" dentro del recuadro.
    expect(await clientes.listar()).toEqual([{ id: 'c-1', nombre: 'Ana', dni: '', tel: '' }]);
  });
});

describe('productos', () => {
  it('convierte centavos a lempiras', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        productos: {
          data: [{
            id: 'p-1', nombre: 'Anillo', categoria: 'Joyeria',
            costo_centavos: 6050, precio_centavos: 14999, stock: 4,
          }],
          error: null,
        },
      },
    });

    const { productos } = await cargarRepos();
    const [producto] = await productos.listar();

    expect(producto.costo).toBe(60.5);
    expect(producto.precio).toBe(149.99);
    expect(producto.stock).toBe(4);
  });
});

describe('ventas', () => {
  it('rearma la venta desde sus tres tablas y calcula el total', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        ventas: {
          data: [{
            id: 'v-1', cliente_id: 'c-1', fecha: '2026-03-04', tipo_pago: 'credito',
            venta_items: [
              { producto_id: 'p-1', nombre: 'Anillo', precio_centavos: 15000, costo_centavos: 9000, cantidad: 2 },
              { producto_id: null, nombre: 'Envio', precio_centavos: 5000, costo_centavos: 0, cantidad: 1 },
            ],
            abonos: [{ monto_centavos: 10000, fecha: '2026-03-04' }],
          }],
          error: null,
        },
      },
    });

    const { ventas } = await cargarRepos();
    const [venta] = await ventas.listar();

    expect(venta.items).toHaveLength(2);
    expect(venta.items[0].qty).toBe(2);
    expect(venta.items[0].precio).toBe(150);
    // El total no está en la base: sale de sumar las líneas. 150x2 + 50.
    expect(venta.total).toBe(350);
    expect(venta.abonos).toEqual([{ monto: 100, fecha: '2026-03-04' }]);
  });

  it('aguanta una venta sin líneas ni abonos', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        ventas: {
          data: [{ id: 'v-1', cliente_id: 'c-1', fecha: '2026-03-04', tipo_pago: 'contado' }],
          error: null,
        },
      },
    });

    const { ventas } = await cargarRepos();
    const [venta] = await ventas.listar();

    expect(venta.items).toEqual([]);
    expect(venta.abonos).toEqual([]);
    expect(venta.total).toBe(0);
  });

  it('guarda un producto libre sin referencia al catálogo', async () => {
    // La interfaz marca como 'custom' lo que se vende sin estar en el
    // catálogo. En la base eso es sencillamente no tener producto.
    const enviados = [];

    estado.cliente = crearSupabaseFalso({
      respuestas: {
        ventas: { data: { id: 'v-1', cliente_id: 'c-1', fecha: '2026-03-04', tipo_pago: 'contado' }, error: null },
        venta_items: (registro) => {
          const carga = registro.metodos.find((m) => m.nombre === 'insert')?.args[0];
          if (carga) enviados.push(...carga);
          return { data: null, error: null };
        },
      },
    });

    const { ventas } = await cargarRepos();
    await ventas.crear({
      clienteId: 'c-1', fecha: '2026-03-04', tipoPago: 'contado',
      items: [{ productoId: 'custom', nombre: 'Ajuste', precio: 25, costo: 0, qty: 1 }],
    });

    expect(enviados[0].producto_id).toBeNull();
    expect(enviados[0].precio_centavos).toBe(2500);
  });
});

describe('recordatorios', () => {
  it('recorta la hora que devuelve Postgres a HH:MM', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        recordatorios: {
          data: [{
            id: 'r-1', cliente_id: 'c-1', venta_id: null, fecha: '2026-03-04',
            hora: '14:30:00', nota: null, estado: 'pendiente', avisado_en: null, visto: false,
          }],
          error: null,
        },
      },
    });

    const { recordatorios } = await cargarRepos();
    const [recordatorio] = await recordatorios.listar();

    // La base devuelve HH:MM:SS; un <input type="time"> espera HH:MM.
    expect(recordatorio.hora).toBe('14:30');
    expect(recordatorio.nota).toBe('');
    expect(recordatorio.clienteId).toBe('c-1');
  });
});

describe('errores', () => {
  it('conserva los detalles de PostgREST, que son los que dicen qué pasó', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        clientes: {
          data: null,
          error: {
            message: 'new row violates row-level security policy',
            details: null,
            hint: null,
            code: '42501',
          },
        },
      },
    });

    const { clientes } = await cargarRepos();

    // Sin `causa` solo queda un mensaje genérico, y el código de Postgres es
    // justo lo que distingue «no tienes permiso» de «falta una columna».
    await expect(clientes.listar()).rejects.toMatchObject({
      name: 'ErrorDeDatos',
      operacion: 'cargar las clientas',
      causa: { code: '42501' },
    });
  });
});

describe('categorías', () => {
  it('devuelve solo los nombres, que es lo que usa la interfaz', async () => {
    estado.cliente = crearSupabaseFalso({
      respuestas: {
        categorias: { data: [{ nombre: 'Joyeria' }, { nombre: 'Perfumes' }], error: null },
      },
    });

    const { categorias } = await cargarRepos();

    expect(await categorias.listar()).toEqual(['Joyeria', 'Perfumes']);
  });
});
