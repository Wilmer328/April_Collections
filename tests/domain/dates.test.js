import { describe, it, expect } from 'vitest';

import {
  aIsoLocal,
  hoyLocal,
  partesDe,
  perteneceAlMes,
  comparar,
  esAnteriorA,
} from '../../src/domain/dates.js';

describe('dates — regresión de los errores de zona horaria', () => {
  // Honduras es UTC−6. El código anterior hacía `new Date('2026-08-01')`, que
  // se interpreta como medianoche UTC, y luego leía `.getMonth()` en hora
  // local: las 18:00 del 31 de julio. Toda venta del día 1 se contabilizaba en
  // el mes anterior y el resumen del mes salía mal.
  it('cuenta el día 1 dentro de su propio mes, no en el anterior', () => {
    expect(perteneceAlMes('2026-08-01', 8, 2026)).toBe(true);
    expect(perteneceAlMes('2026-08-01', 7, 2026)).toBe(false);
  });

  it('cuenta correctamente el día 1 en todos los meses del año', () => {
    for (let mes = 1; mes <= 12; mes += 1) {
      const primero = `2026-${String(mes).padStart(2, '0')}-01`;
      expect(perteneceAlMes(primero, mes, 2026)).toBe(true);
    }
  });

  // El código anterior usaba `toISOString().slice(0, 10)`, que devuelve la
  // fecha UTC. Pasadas las 18:00 en Honduras ya es el día siguiente en UTC, así
  // que "cobrado hoy" se ponía en cero y los recordatorios del día desaparecían.
  it('mantiene la fecha local aunque en UTC ya sea otro día', () => {
    const nocheDel28 = new Date(2026, 7, 28, 23, 30, 0);

    expect(hoyLocal(nocheDel28)).toBe('2026-08-28');
  });

  it('mantiene la fecha local en la madrugada', () => {
    const madrugadaDel29 = new Date(2026, 7, 29, 0, 15, 0);

    expect(hoyLocal(madrugadaDel29)).toBe('2026-08-29');
  });
});

describe('dates — conversión', () => {
  it('rellena con ceros el mes y el día', () => {
    expect(aIsoLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('rechaza una fecha inválida', () => {
    expect(() => aIsoLocal(new Date('no es fecha'))).toThrow(TypeError);
    expect(() => aIsoLocal('2026-08-01')).toThrow(TypeError);
  });

  it('descompone la fecha con el mes de 1 a 12', () => {
    expect(partesDe('2026-08-01')).toEqual({ anio: 2026, mes: 8, dia: 1 });
  });

  it('rechaza formatos que no sean YYYY-MM-DD', () => {
    expect(() => partesDe('01/08/2026')).toThrow(TypeError);
    expect(() => partesDe('2026-8-1')).toThrow(TypeError);
    expect(() => partesDe(undefined)).toThrow(TypeError);
  });
});

describe('dates — comparación', () => {
  it('ordena las fechas cronológicamente', () => {
    expect(comparar('2026-08-01', '2026-08-02')).toBeLessThan(0);
    expect(comparar('2026-08-02', '2026-08-01')).toBeGreaterThan(0);
    expect(comparar('2026-08-01', '2026-08-01')).toBe(0);
  });

  it('compara bien entre meses y años distintos', () => {
    expect(esAnteriorA('2026-08-31', '2026-09-01')).toBe(true);
    expect(esAnteriorA('2025-12-31', '2026-01-01')).toBe(true);
    expect(esAnteriorA('2026-09-01', '2026-08-31')).toBe(false);
  });
});
