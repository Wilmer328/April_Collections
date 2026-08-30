import { describe, it, expect } from 'vitest';

import {
  hayStockSuficiente,
  descontarStock,
  ajustarStock,
  nivelDeStock,
  validarStock,
  NIVEL_STOCK,
  UMBRAL_STOCK_BAJO,
  CATEGORIAS,
} from '../../src/domain/inventory.js';

describe('inventory — disponibilidad', () => {
  it('hay suficiente si alcanza justo', () => {
    expect(hayStockSuficiente(3, 3)).toBe(true);
  });

  it('no hay suficiente si se piden más unidades de las que quedan', () => {
    expect(hayStockSuficiente(2, 3)).toBe(false);
  });

  it('un producto agotado no alcanza para nada', () => {
    expect(hayStockSuficiente(0, 1)).toBe(false);
  });
});

describe('inventory — venta', () => {
  it('descuenta las unidades vendidas', () => {
    expect(descontarStock(10, 3)).toBe(7);
  });

  it('deja el producto en cero si se vende lo último', () => {
    expect(descontarStock(3, 3)).toBe(0);
  });

  // Falla en vez de recortar en cero: si el sistema permitiera vender lo que no
  // existe, el inventario dejaría de corresponder con la mercadería real.
  it('se niega a vender más de lo que hay', () => {
    expect(() => descontarStock(2, 5)).toThrow(RangeError);
  });
});

describe('inventory — ajuste manual', () => {
  it('agrega unidades al recibir mercadería', () => {
    expect(ajustarStock(5, 12)).toBe(17);
  });

  it('quita unidades al corregir el conteo', () => {
    expect(ajustarStock(5, -2)).toBe(3);
  });

  // A diferencia de una venta, aquí sí se recorta: es un conteo físico, y
  // quitar más de lo que hay solo significa que no quedó nada.
  it('nunca deja el stock en negativo', () => {
    expect(ajustarStock(3, -10)).toBe(0);
  });

  it('rechaza ajustes fraccionarios', () => {
    expect(() => ajustarStock(5, 1.5)).toThrow(TypeError);
  });
});

describe('inventory — nivel de existencias', () => {
  it('marca agotado en cero', () => {
    expect(nivelDeStock(0)).toBe(NIVEL_STOCK.AGOTADO);
  });

  it('marca bajo hasta el umbral inclusive', () => {
    expect(nivelDeStock(1)).toBe(NIVEL_STOCK.BAJO);
    expect(nivelDeStock(UMBRAL_STOCK_BAJO)).toBe(NIVEL_STOCK.BAJO);
  });

  it('marca disponible por encima del umbral', () => {
    expect(nivelDeStock(UMBRAL_STOCK_BAJO + 1)).toBe(NIVEL_STOCK.DISPONIBLE);
  });
});

describe('inventory — validación', () => {
  it('rechaza stock negativo o fraccionario', () => {
    expect(() => validarStock(-1)).toThrow(RangeError);
    expect(() => validarStock(2.5)).toThrow(TypeError);
  });
});

describe('inventory — categorías', () => {
  it('son las cinco del catálogo y no se pueden modificar', () => {
    expect(CATEGORIAS).toHaveLength(5);
    expect(CATEGORIAS).toContain('Joyería');
    expect(Object.isFrozen(CATEGORIAS)).toBe(true);
  });
});
