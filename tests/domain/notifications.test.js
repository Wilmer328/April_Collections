import { describe, it, expect } from 'vitest';

import {
  MINUTOS_ANTICIPACION,
  MINUTOS_ENTRE_INSISTENCIAS,
  momentoDe,
  momentoDeAviso,
  debeAvisar,
  pendientesDeAvisar,
  minutosRestantes,
  describirMomento,
} from '../../src/domain/notifications.js';
import { ESTADO } from '../../src/domain/reminders.js';

/** Cobro prometido para el 29 de agosto de 2026 a las 07:00. */
const recordatorio = (extra = {}) => ({
  id: '1',
  ventaId: 'v1',
  fecha: '2026-08-29',
  hora: '07:00',
  estado: ESTADO.PENDIENTE,
  ...extra,
});

/** Instante local del 29 de agosto de 2026. */
const alas = (h, m = 0) => new Date(2026, 7, 29, h, m, 0, 0);

describe('notifications — momento del aviso', () => {
  it('combina fecha y hora en el reloj local', () => {
    const momento = momentoDe('2026-08-29', '07:00');

    expect(momento.getFullYear()).toBe(2026);
    expect(momento.getMonth()).toBe(7);
    expect(momento.getDate()).toBe(29);
    expect(momento.getHours()).toBe(7);
  });

  // Si la cadena se pasara directamente a Date se leería como UTC y en
  // Honduras el aviso se correría seis horas.
  it('no se desplaza por la zona horaria', () => {
    expect(momentoDe('2026-08-29', '00:30').getDate()).toBe(29);
    expect(momentoDe('2026-08-29', '23:30').getDate()).toBe(29);
  });

  it('usa las 09:00 si no hay hora', () => {
    expect(momentoDe('2026-08-29').getHours()).toBe(9);
  });

  it('rechaza una hora con formato inválido', () => {
    expect(() => momentoDe('2026-08-29', 'mañana')).toThrow(TypeError);
  });

  it(`avisa ${MINUTOS_ANTICIPACION} minutos antes de lo prometido`, () => {
    const aviso = momentoDeAviso(recordatorio());

    expect(aviso.getHours()).toBe(6);
    expect(aviso.getMinutes()).toBe(30);
  });

  it('cruza bien el cambio de día', () => {
    const aviso = momentoDeAviso(recordatorio({ hora: '00:15' }));

    expect(aviso.getDate()).toBe(28);
    expect(aviso.getHours()).toBe(23);
    expect(aviso.getMinutes()).toBe(45);
  });
});

describe('notifications — cuándo toca avisar', () => {
  it('no avisa antes de tiempo', () => {
    expect(debeAvisar(recordatorio(), alas(6, 29))).toBe(false);
  });

  it('avisa justo al llegar la media hora previa', () => {
    expect(debeAvisar(recordatorio(), alas(6, 30))).toBe(true);
  });

  it('sigue avisando pasada la hora prometida', () => {
    expect(debeAvisar(recordatorio(), alas(9))).toBe(true);
  });

  it('no avisa de un cobro ya realizado', () => {
    expect(debeAvisar(recordatorio({ estado: ESTADO.COMPLETADO }), alas(9))).toBe(false);
  });

  it('no avisa de uno descartado', () => {
    expect(debeAvisar(recordatorio({ estado: ESTADO.DESCARTADO }), alas(9))).toBe(false);
  });
});

describe('notifications — insiste hasta que la usuaria lo ve', () => {
  // La versión anterior lo marcaba como notificado al mostrarlo, así que si la
  // aplicación estaba cerrada en ese minuto exacto el aviso se perdía.
  it('vuelve a avisar si aún no se ha visto', () => {
    const yaAvisado = recordatorio({ avisadoEn: alas(6, 30).toISOString() });

    expect(debeAvisar(yaAvisado, alas(6, 45))).toBe(true);
  });

  it('deja de avisar en cuanto se marca como visto', () => {
    const visto = recordatorio({ visto: true, avisadoEn: alas(6, 30).toISOString() });

    expect(debeAvisar(visto, alas(9))).toBe(false);
  });

  it('no repite antes de que pase el intervalo', () => {
    const reciente = recordatorio({ avisadoEn: alas(6, 30).toISOString() });
    const casiElIntervalo = alas(6, 30 + MINUTOS_ENTRE_INSISTENCIAS - 1);

    expect(debeAvisar(reciente, casiElIntervalo)).toBe(false);
  });

  it('repite al cumplirse el intervalo', () => {
    const reciente = recordatorio({ avisadoEn: alas(6, 30).toISOString() });
    const justo = alas(6, 30 + MINUTOS_ENTRE_INSISTENCIAS);

    expect(debeAvisar(reciente, justo)).toBe(true);
  });

  // Caso real: el aviso saltó anoche con la aplicación cerrada. Al abrirla hoy
  // el cobro sigue pendiente y debe aparecer, no haberse perdido.
  it('un aviso de un día anterior sigue apareciendo', () => {
    const deAyer = recordatorio({ fecha: '2026-08-28' });

    expect(debeAvisar(deAyer, alas(10))).toBe(true);
  });
});

describe('notifications — cola de avisos', () => {
  it('devuelve solo los que tocan, del más urgente al menos', () => {
    const lista = [
      recordatorio({ id: 'tarde', hora: '10:00' }),
      recordatorio({ id: 'futuro', fecha: '2026-09-10' }),
      recordatorio({ id: 'temprano', hora: '07:00' }),
      recordatorio({ id: 'cobrado', hora: '08:00', estado: ESTADO.COMPLETADO }),
    ];

    const cola = pendientesDeAvisar(lista, alas(11)).map((r) => r.id);

    expect(cola).toEqual(['temprano', 'tarde']);
  });

  it('devuelve lista vacía si no toca ninguno', () => {
    expect(pendientesDeAvisar([recordatorio()], alas(5))).toEqual([]);
  });
});

describe('notifications — texto del aviso', () => {
  it('cuenta los minutos que faltan', () => {
    expect(minutosRestantes(recordatorio(), alas(6, 30))).toBe(30);
  });

  it('los cuenta en negativo si ya pasó', () => {
    expect(minutosRestantes(recordatorio(), alas(7, 15))).toBe(-15);
  });

  it('describe la antelación en minutos', () => {
    expect(describirMomento(recordatorio(), alas(6, 30))).toBe('es en 30 minutos');
  });

  it('usa el singular con un minuto', () => {
    expect(describirMomento(recordatorio(), alas(6, 59))).toBe('es en 1 minuto');
  });

  it('avisa cuando ya es la hora', () => {
    expect(describirMomento(recordatorio(), alas(7))).toBe('es ahora mismo');
  });

  it('avisa cuando la hora ya pasó', () => {
    expect(describirMomento(recordatorio(), alas(8))).toBe('estaba para las 07:00');
  });
});
