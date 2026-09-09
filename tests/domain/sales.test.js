import { describe, it, expect } from 'vitest';

import {
  TIPO_PAGO,
  totalVenta,
  totalAbonado,
  saldoPendiente,
  estaPagada,
  gananciaVenta,
  abonoInicial,
} from '../../src/domain/sales.js';

/** Aretes a 250 y perfume a 400, comprados a 150 y 280. */
const items = [
  { nombre: 'Aretes dorados', precioCentavos: 25000, costoCentavos: 15000, cantidad: 2 },
  { nombre: 'Perfume', precioCentavos: 40000, costoCentavos: 28000, cantidad: 1 },
];

describe('sales — total', () => {
  it('multiplica precio por cantidad y suma', () => {
    expect(totalVenta(items)).toBe(90000);
  });

  it('una venta sin productos vale cero', () => {
    expect(totalVenta([])).toBe(0);
  });

  it('rechaza cantidades que no sirven', () => {
    expect(() => totalVenta([{ precioCentavos: 100, cantidad: 0 }])).toThrow(RangeError);
    expect(() => totalVenta([{ precioCentavos: 100, cantidad: 1.5 }])).toThrow(TypeError);
    expect(() => totalVenta('no es lista')).toThrow(TypeError);
  });
});

describe('sales — saldo pendiente', () => {
  it('descuenta los abonos del total', () => {
    const venta = { items, abonos: [{ montoCentavos: 30000, fecha: '2026-08-01' }] };

    expect(totalAbonado(venta.abonos)).toBe(30000);
    expect(saldoPendiente(venta)).toBe(60000);
  });

  it('una venta sin abonos se debe entera', () => {
    expect(saldoPendiente({ items })).toBe(90000);
  });

  it('no devuelve saldo a favor si se abonó de más', () => {
    const venta = { items, abonos: [{ montoCentavos: 100000, fecha: '2026-08-01' }] };

    expect(saldoPendiente(venta)).toBe(0);
  });
});

describe('sales — cuándo está pagada', () => {
  // Con centavos enteros la comparación es exacta. El código anterior
  // preguntaba `pendiente < 0.01` porque arrastraba error de coma flotante.
  it('queda pagada al cubrir el total exacto', () => {
    const venta = { items, abonos: [{ montoCentavos: 90000, fecha: '2026-08-01' }] };

    expect(estaPagada(venta)).toBe(true);
  });

  it('no está pagada si falta un solo centavo', () => {
    const venta = { items, abonos: [{ montoCentavos: 89999, fecha: '2026-08-01' }] };

    expect(estaPagada(venta)).toBe(false);
    expect(saldoPendiente(venta)).toBe(1);
  });

  it('queda pagada tras varios abonos parciales', () => {
    const venta = {
      items,
      abonos: [
        { montoCentavos: 30000, fecha: '2026-08-01' },
        { montoCentavos: 30000, fecha: '2026-08-10' },
        { montoCentavos: 30000, fecha: '2026-08-20' },
      ],
    };

    expect(estaPagada(venta)).toBe(true);
  });
});

describe('sales — ganancia', () => {
  it('resta el costo de la mercadería al total', () => {
    // Vendido 90000, costó 2×15000 + 28000 = 58000.
    expect(gananciaVenta({ items })).toBe(32000);
  });

  it('se reconoce al vender, no al cobrar', () => {
    const aCredito = { items, abonos: [] };
    const cobrada = { items, abonos: [{ montoCentavos: 90000, fecha: '2026-08-01' }] };

    expect(gananciaVenta(aCredito)).toBe(gananciaVenta(cobrada));
  });

  it('es negativa si se vende por debajo del costo', () => {
    const conPerdida = [{ precioCentavos: 10000, costoCentavos: 15000, cantidad: 1 }];

    expect(gananciaVenta({ items: conPerdida })).toBe(-5000);
  });
});

describe('sales — abono inicial según la forma de pago', () => {
  it('al contado se paga todo', () => {
    const monto = abonoInicial({ tipoPago: TIPO_PAGO.CONTADO, totalCentavos: 90000 });

    expect(monto).toBe(90000);
  });

  it('a crédito no se entrega nada', () => {
    const monto = abonoInicial({ tipoPago: TIPO_PAGO.CREDITO, totalCentavos: 90000 });

    expect(monto).toBe(0);
  });

  it('con abono inicial se registra lo entregado', () => {
    const monto = abonoInicial({
      tipoPago: TIPO_PAGO.ABONO,
      totalCentavos: 90000,
      entregadoCentavos: 30000,
    });

    expect(monto).toBe(30000);
  });

  it('el abono inicial no puede superar el total', () => {
    const monto = abonoInicial({
      tipoPago: TIPO_PAGO.ABONO,
      totalCentavos: 90000,
      entregadoCentavos: 120000,
    });

    expect(monto).toBe(90000);
  });

  it('rechaza una forma de pago desconocida', () => {
    expect(() => abonoInicial({ tipoPago: 'tarjeta', totalCentavos: 100 })).toThrow(RangeError);
  });
});
