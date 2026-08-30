import { describe, it, expect } from 'vitest';

import { aCentavos, aLempiras, formatear, validarCentavos } from '../../src/domain/money.js';

describe('money — el motivo de trabajar en centavos', () => {
  // Con decimales, 0.1 + 0.2 da 0.30000000000000004. Sobre una venta con
  // abonos parciales el error se acumulaba y una deuda saldada quedaba con
  // fracciones de centavo pendientes, por eso el código anterior comparaba
  // contra una tolerancia de 0.01 repetida en ocho sitios.
  it('suma exacta donde los decimales fallan', () => {
    expect(0.1 + 0.2).not.toBe(0.3);

    expect(aCentavos(0.1) + aCentavos(0.2)).toBe(aCentavos(0.3));
  });

  it('un total dividido en tres abonos cierra en cero exacto', () => {
    const total = aCentavos(100);
    const abonos = [aCentavos(33.33), aCentavos(33.33), aCentavos(33.34)];

    const saldo = abonos.reduce((resto, abono) => resto - abono, total);

    expect(saldo).toBe(0);
  });
});

describe('money — conversión', () => {
  it('convierte lempiras a centavos', () => {
    expect(aCentavos(1)).toBe(100);
    expect(aCentavos(19.99)).toBe(1999);
    expect(aCentavos(0)).toBe(0);
  });

  it('acepta el texto que llega de un campo de formulario', () => {
    expect(aCentavos('250.50')).toBe(25050);
  });

  it('redondea al centavo más cercano', () => {
    expect(aCentavos(10.005)).toBe(1001);
    expect(aCentavos(10.004)).toBe(1000);
  });

  it('rechaza lo que no es un número', () => {
    expect(() => aCentavos('abc')).toThrow(TypeError);
    expect(() => aCentavos(undefined)).toThrow(TypeError);
    expect(() => aCentavos(Infinity)).toThrow(TypeError);
  });

  it('vuelve a lempiras', () => {
    expect(aLempiras(1999)).toBe(19.99);
  });
});

describe('money — formato', () => {
  it('muestra siempre dos decimales', () => {
    expect(formatear(0)).toBe('L 0.00');
    expect(formatear(500)).toBe('L 5.00');
  });

  it('separa los miles', () => {
    expect(formatear(125000)).toBe('L 1,250.00');
  });

  it('coloca el signo antes de la moneda', () => {
    expect(formatear(-500)).toBe('-L 5.00');
  });
});

describe('money — validación', () => {
  it('exige centavos enteros', () => {
    expect(() => validarCentavos(10.5)).toThrow(TypeError);
    expect(() => validarCentavos(NaN)).toThrow(TypeError);
    expect(() => validarCentavos(10)).not.toThrow();
  });
});
