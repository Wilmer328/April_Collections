import { describe, it, expect } from 'vitest';

import {
  aIsoLocal,
  hoyLocal,
  partesDe,
  perteneceAlMes,
  comparar,
  esAnteriorA,
  sumarDias,
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

describe('dates — sumar días', () => {
  it('suma dentro del mismo mes', () => {
    expect(sumarDias('2026-03-10', 7)).toBe('2026-03-17');
    expect(sumarDias('2026-03-10', 1)).toBe('2026-03-11');
    expect(sumarDias('2026-03-10', 0)).toBe('2026-03-10');
  });

  it('cruza el final de mes sin saber cuántos días tiene', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarDias('2026-04-30', 1)).toBe('2026-05-01');
    // Marzo tiene 31: el día 35 no existe y debe caer en abril.
    expect(sumarDias('2026-03-20', 15)).toBe('2026-04-04');
  });

  it('cruza el final de año', () => {
    expect(sumarDias('2026-12-25', 10)).toBe('2027-01-04');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('respeta los años bisiestos', () => {
    // 2028 es bisiesto: el 29 de febrero existe.
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2028-02-28', 2)).toBe('2028-03-01');
    // 2026 no lo es: del 28 se pasa directo a marzo.
    expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('admite días negativos', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('no se desplaza un día por interpretar la fecha como UTC', () => {
    // El fallo clásico: new Date('2026-03-15') es UTC, y al oeste de Greenwich
    // devuelve el día anterior. Un plazo «a una semana» caeria a los seis días.
    for (const dias of [1, 7, 15, 30]) {
      const resultado = sumarDias('2026-03-15', dias);
      const esperado = new Date(2026, 2, 15 + dias);
      expect(resultado).toBe(
        `${esperado.getFullYear()}-${String(esperado.getMonth() + 1).padStart(2, '0')}-${String(esperado.getDate()).padStart(2, '0')}`,
      );
    }
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(() => sumarDias('15/03/2026', 1)).toThrow();
  });
});
