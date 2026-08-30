import { describe, it, expect } from 'vitest';

import {
  precioDesdeMargen,
  margenDesdePrecio,
  gananciaUnitaria,
  validarPorcentaje,
  MARGEN_POR_DEFECTO,
} from '../../src/domain/pricing.js';

describe('pricing — precio a partir del margen', () => {
  it('aplica el porcentaje sobre el costo', () => {
    // Costo 100, margen 30 % -> 130.
    expect(precioDesdeMargen(10000, 30)).toBe(13000);
  });

  it('duplica el precio con un margen del 100 %', () => {
    expect(precioDesdeMargen(15000, 100)).toBe(30000);
  });

  it('con margen cero el precio es el costo', () => {
    expect(precioDesdeMargen(15000, 0)).toBe(15000);
  });

  it('redondea al centavo', () => {
    // 333 × 1.155 = 384.615 centavos.
    expect(precioDesdeMargen(333, 15.5)).toBe(385);
  });
});

describe('pricing — margen a partir del precio', () => {
  it('es la operación inversa', () => {
    expect(margenDesdePrecio(10000, 13000)).toBeCloseTo(30);
  });

  it('ida y vuelta conserva el margen', () => {
    const costo = 25000;
    const precio = precioDesdeMargen(costo, 45);

    expect(margenDesdePrecio(costo, precio)).toBeCloseTo(45, 1);
  });

  // Sobre un costo de cero el margen es una división por cero. Devolver 0 evita
  // que la interfaz muestre "Infinity %" cuando el campo de costo está vacío.
  it('devuelve cero si el costo es cero', () => {
    expect(margenDesdePrecio(0, 5000)).toBe(0);
  });

  it('es negativo si se vende por debajo del costo', () => {
    expect(margenDesdePrecio(10000, 8000)).toBeCloseTo(-20);
  });
});

describe('pricing — ganancia por unidad', () => {
  it('es la diferencia entre precio y costo', () => {
    expect(gananciaUnitaria(15000, 25000)).toBe(10000);
  });

  it('es negativa si se vende con pérdida', () => {
    expect(gananciaUnitaria(25000, 15000)).toBe(-10000);
  });
});

describe('pricing — validación', () => {
  it('rechaza un margen negativo', () => {
    expect(() => validarPorcentaje(-10)).toThrow(RangeError);
    expect(() => precioDesdeMargen(10000, -5)).toThrow(RangeError);
  });

  it('rechaza lo que no es número', () => {
    expect(() => validarPorcentaje('treinta')).toThrow(TypeError);
    expect(() => validarPorcentaje(NaN)).toThrow(TypeError);
  });

  it('el margen sugerido es utilizable', () => {
    expect(() => validarPorcentaje(MARGEN_POR_DEFECTO)).not.toThrow();
  });
});
