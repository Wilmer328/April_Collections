import { describe, it, expect } from 'vitest';

import {
  ESTADO,
  estaPendiente,
  esDeHoy,
  estaVencido,
  completarPorVenta,
  ordenarPorMomento,
  contarDeHoy,
} from '../../src/domain/reminders.js';

const HOY = '2026-08-29';

/** Construye un recordatorio con lo mínimo, para no repetir literales. */
const recordatorio = (extra = {}) => ({
  id: '1',
  ventaId: 'v1',
  fecha: HOY,
  hora: '09:00',
  estado: ESTADO.PENDIENTE,
  ...extra,
});

describe('reminders — estado', () => {
  it('solo está pendiente el que no se cerró', () => {
    expect(estaPendiente(recordatorio())).toBe(true);
    expect(estaPendiente(recordatorio({ estado: ESTADO.COMPLETADO }))).toBe(false);
    expect(estaPendiente(recordatorio({ estado: ESTADO.DESCARTADO }))).toBe(false);
  });
});

describe('reminders — de hoy y vencidos', () => {
  it('es de hoy si la fecha coincide y sigue pendiente', () => {
    expect(esDeHoy(recordatorio(), HOY)).toBe(true);
  });

  it('un recordatorio ya cobrado no vuelve a aparecer hoy', () => {
    expect(esDeHoy(recordatorio({ estado: ESTADO.COMPLETADO }), HOY)).toBe(false);
  });

  it('está vencido si la fecha prometida ya pasó', () => {
    expect(estaVencido(recordatorio({ fecha: '2026-08-20' }), HOY)).toBe(true);
  });

  it('el de hoy todavía no está vencido', () => {
    expect(estaVencido(recordatorio(), HOY)).toBe(false);
  });

  it('uno futuro no está vencido ni es de hoy', () => {
    const futuro = recordatorio({ fecha: '2026-09-15' });

    expect(estaVencido(futuro, HOY)).toBe(false);
    expect(esDeHoy(futuro, HOY)).toBe(false);
  });

  it('cuenta los cobros que tocan hoy', () => {
    const lista = [
      recordatorio({ id: '1' }),
      recordatorio({ id: '2' }),
      recordatorio({ id: '3', fecha: '2026-09-01' }),
      recordatorio({ id: '4', estado: ESTADO.COMPLETADO }),
    ];

    expect(contarDeHoy(lista, HOY)).toBe(2);
  });
});

describe('reminders — cierre automático al saldarse la venta', () => {
  // Es la regla de producto que da valor a esta función: al cobrarse la deuda
  // nadie debe quedar con un recordatorio pidiéndole que llame a cobrar.
  it('completa los recordatorios de la venta saldada', () => {
    const lista = [recordatorio({ id: '1', ventaId: 'v1' })];

    const resultado = completarPorVenta(lista, 'v1');

    expect(resultado[0].estado).toBe(ESTADO.COMPLETADO);
  });

  it('no toca los de otras ventas', () => {
    const lista = [
      recordatorio({ id: '1', ventaId: 'v1' }),
      recordatorio({ id: '2', ventaId: 'v2' }),
    ];

    const resultado = completarPorVenta(lista, 'v1');

    expect(resultado[0].estado).toBe(ESTADO.COMPLETADO);
    expect(resultado[1].estado).toBe(ESTADO.PENDIENTE);
  });

  it('respeta los que la usuaria ya había descartado', () => {
    const lista = [recordatorio({ ventaId: 'v1', estado: ESTADO.DESCARTADO })];

    expect(completarPorVenta(lista, 'v1')[0].estado).toBe(ESTADO.DESCARTADO);
  });

  it('no modifica la lista original', () => {
    const lista = [recordatorio({ ventaId: 'v1' })];

    completarPorVenta(lista, 'v1');

    expect(lista[0].estado).toBe(ESTADO.PENDIENTE);
  });
});

describe('reminders — orden', () => {
  it('ordena por fecha y, dentro del día, por hora', () => {
    const lista = [
      recordatorio({ id: 'tarde', fecha: '2026-08-29', hora: '17:00' }),
      recordatorio({ id: 'manana', fecha: '2026-08-30', hora: '08:00' }),
      recordatorio({ id: 'temprano', fecha: '2026-08-29', hora: '08:00' }),
    ];

    const ordenados = ordenarPorMomento(lista).map((r) => r.id);

    expect(ordenados).toEqual(['temprano', 'tarde', 'manana']);
  });

  it('no modifica la lista original', () => {
    const lista = [
      recordatorio({ id: 'b', fecha: '2026-09-01' }),
      recordatorio({ id: 'a', fecha: '2026-08-01' }),
    ];

    ordenarPorMomento(lista);

    expect(lista[0].id).toBe('b');
  });
});
