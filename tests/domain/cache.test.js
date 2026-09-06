import { describe, it, expect, beforeEach, vi } from 'vitest';

import { leer, guardar, limpiar, describirAntiguedad } from '../../src/data/cache.js';

/** localStorage mínimo, porque las pruebas corren en Node y no en un navegador. */
function almacenFalso() {
  const contenido = new Map();

  return {
    getItem: (clave) => contenido.get(clave) ?? null,
    setItem: (clave, valor) => contenido.set(clave, String(valor)),
    removeItem: (clave) => contenido.delete(clave),
    get length() {
      return contenido.size;
    },
    key: (i) => [...contenido.keys()][i],
    _claves: () => [...contenido.keys()],
    _romper: () => {
      throw new Error('QuotaExceededError');
    },
  };
}

const DATOS = {
  clientes: [{ id: '1', nombre: 'María' }],
  productos: [{ id: 'p1', nombre: 'Aretes' }],
  ventas: [],
  recordatorios: [],
  categorias: ['Joyería'],
};

const ANA = 'usuario-ana';
const BETO = 'usuario-beto';

beforeEach(() => {
  globalThis.localStorage = almacenFalso();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('cache — guardar y leer', () => {
  it('devuelve lo guardado para esa cuenta', () => {
    guardar(ANA, DATOS);

    expect(leer(ANA).datos.clientes[0].nombre).toBe('María');
  });

  it('anota cuándo se guardó', () => {
    guardar(ANA, DATOS);

    expect(new Date(leer(ANA).guardadoEn).getTime()).toBeGreaterThan(0);
  });

  it('no hay nada antes de la primera visita', () => {
    expect(leer(ANA)).toBeNull();
  });

  it('ignora una llamada sin identificador de cuenta', () => {
    expect(guardar(undefined, DATOS)).toBe(false);
    expect(leer(undefined)).toBeNull();
  });
});

describe('cache — separación entre cuentas', () => {
  // El riesgo que motiva atar la cache al identificador: en un telefono
  // compartido, los datos de una cuenta no pueden aparecer en otra.
  it('lo guardado por una cuenta no se lee desde otra', () => {
    guardar(ANA, DATOS);

    expect(leer(BETO)).toBeNull();
  });

  it('dos cuentas conviven sin pisarse', () => {
    guardar(ANA, DATOS);
    guardar(BETO, { ...DATOS, clientes: [{ id: '2', nombre: 'Karla' }] });

    expect(leer(ANA).datos.clientes[0].nombre).toBe('María');
    expect(leer(BETO).datos.clientes[0].nombre).toBe('Karla');
  });

  it('cerrar sesión borra la caché de todas las cuentas', () => {
    guardar(ANA, DATOS);
    guardar(BETO, DATOS);

    limpiar();

    expect(leer(ANA)).toBeNull();
    expect(leer(BETO)).toBeNull();
  });

  it('no toca lo que no es suyo al limpiar', () => {
    localStorage.setItem('otra_cosa', 'importante');
    guardar(ANA, DATOS);

    limpiar();

    expect(localStorage.getItem('otra_cosa')).toBe('importante');
  });
});

describe('cache — resistencia a datos corruptos', () => {
  it('descarta una copia que no es JSON válido', () => {
    guardar(ANA, DATOS);
    localStorage.setItem(localStorage._claves()[0], '{esto no es json');

    expect(leer(ANA)).toBeNull();
  });

  // Una copia a medias romperia la interfaz en el primer render, que es peor
  // que no tener cache.
  it('descarta una copia a la que le falta un conjunto', () => {
    const incompleta = { ...DATOS };
    delete incompleta.ventas;
    guardar(ANA, incompleta);

    expect(leer(ANA)).toBeNull();
  });

  it('no revienta si el almacenamiento está bloqueado', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
    };

    expect(() => leer(ANA)).not.toThrow();
    expect(guardar(ANA, DATOS)).toBe(false);
  });
});

describe('cache — antigüedad', () => {
  const ahora = new Date(2026, 8, 6, 12, 0, 0);
  const hace = (minutos) => new Date(ahora.getTime() - minutos * 60000).toISOString();

  it('describe minutos, horas y días', () => {
    expect(describirAntiguedad(hace(0), ahora)).toBe('hace un momento');
    expect(describirAntiguedad(hace(1), ahora)).toBe('hace 1 minuto');
    expect(describirAntiguedad(hace(45), ahora)).toBe('hace 45 minutos');
    expect(describirAntiguedad(hace(60), ahora)).toBe('hace 1 hora');
    expect(describirAntiguedad(hace(300), ahora)).toBe('hace 5 horas');
    expect(describirAntiguedad(hace(60 * 24 * 3), ahora)).toBe('hace 3 días');
  });
});
