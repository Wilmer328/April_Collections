import { describe, it, expect } from 'vitest';

import {
  ESTADO,
  estaPendiente,
  esDeHoy,
  estaVencido,
  completarPorVenta,
  ordenarPorMomento,
  contarDeHoy,
  vencidos,
  contarPorAtender,
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

describe('reminders — cobros vencidos', () => {
  const HOY = '2026-03-15';

  const hacer = (fecha, estado = ESTADO.PENDIENTE) => ({ id: fecha, fecha, hora: '09:00', estado });

  it('lista solo los pendientes cuya fecha ya pasó', () => {
    const lista = [
      hacer('2026-03-10'),
      hacer('2026-03-15'),   // hoy: aún no venció
      hacer('2026-03-20'),   // futuro
    ];

    expect(vencidos(lista, HOY).map((r) => r.fecha)).toEqual(['2026-03-10']);
  });

  it('ordena del más antiguo al más reciente', () => {
    const lista = [hacer('2026-03-12'), hacer('2026-02-01'), hacer('2026-03-01')];

    // La promesa más vieja pesa más: es la que conviene atender primero.
    expect(vencidos(lista, HOY).map((r) => r.fecha)).toEqual([
      '2026-02-01', '2026-03-01', '2026-03-12',
    ]);
  });

  it('ignora los ya pagados o descartados aunque su fecha haya pasado', () => {
    const lista = [
      hacer('2026-03-01', ESTADO.COMPLETADO),
      hacer('2026-03-02', ESTADO.DESCARTADO),
      hacer('2026-03-03'),
    ];

    expect(vencidos(lista, HOY).map((r) => r.fecha)).toEqual(['2026-03-03']);
  });

  it('cuenta para atender los vencidos y los de hoy', () => {
    const lista = [
      hacer('2026-03-01'),   // vencido
      hacer('2026-03-10'),   // vencido
      hacer('2026-03-15'),   // hoy
      hacer('2026-03-20'),   // futuro: todavía no toca
      hacer('2026-03-02', ESTADO.COMPLETADO),
    ];

    expect(contarPorAtender(lista, HOY)).toBe(3);
  });

  it('el contador no se vacía por no haber abierto la aplicación', () => {
    // Un cobro de ayer sigue reclamando atención hoy. Antes solo se contaban
    // los del día, y al día siguiente el contador volvía a cero.
    const ayer = [hacer('2026-03-14')];

    expect(contarDeHoy(ayer, HOY)).toBe(0);
    expect(contarPorAtender(ayer, HOY)).toBe(1);
  });
});
