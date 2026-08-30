/**
 * Recordatorios de cobro.
 *
 * La usuaria agenda el día y la hora en que una clienta prometió pagar. La
 * regla de producto que da valor a esta función: cuando la deuda se salda, sus
 * recordatorios se cierran solos, para que nadie llame a cobrar algo que ya
 * está pagado.
 */

import { comparar } from './dates.js';

/** Situaciones en las que puede estar un recordatorio. */
export const ESTADO = Object.freeze({
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  DESCARTADO: 'descartado',
});

/** Hora que se usa si la usuaria no elige otra. */
export const HORA_POR_DEFECTO = '09:00';

/**
 * @typedef {{ id: string, ventaId?: string, fecha: string, hora: string, estado: string }} Recordatorio
 */

/**
 * Indica si el recordatorio sigue activo.
 *
 * @param {Recordatorio} recordatorio
 * @returns {boolean}
 */
export function estaPendiente(recordatorio) {
  return recordatorio.estado === ESTADO.PENDIENTE;
}

/**
 * Indica si toca cobrar hoy.
 *
 * @param {Recordatorio} recordatorio
 * @param {string} hoyIso
 * @returns {boolean}
 */
export function esDeHoy(recordatorio, hoyIso) {
  return estaPendiente(recordatorio) && comparar(recordatorio.fecha, hoyIso) === 0;
}

/**
 * Indica si la fecha prometida ya pasó y sigue sin cobrarse.
 *
 * @param {Recordatorio} recordatorio
 * @param {string} hoyIso
 * @returns {boolean}
 */
export function estaVencido(recordatorio, hoyIso) {
  return estaPendiente(recordatorio) && comparar(recordatorio.fecha, hoyIso) < 0;
}

/**
 * Cierra los recordatorios de una venta que acaba de quedar saldada.
 *
 * Devuelve una lista nueva en lugar de modificar la recibida: así la capa de
 * datos decide cuándo persistir, y la función se puede probar sin efectos
 * colaterales.
 *
 * @param {Recordatorio[]} recordatorios
 * @param {string} ventaId
 * @returns {Recordatorio[]} lista con los recordatorios de esa venta completados.
 */
export function completarPorVenta(recordatorios, ventaId) {
  return recordatorios.map((recordatorio) => {
    const corresponde = recordatorio.ventaId === ventaId && estaPendiente(recordatorio);

    return corresponde ? { ...recordatorio, estado: ESTADO.COMPLETADO } : recordatorio;
  });
}

/**
 * Ordena los recordatorios cronológicamente, del más próximo al más lejano.
 *
 * @param {Recordatorio[]} recordatorios
 * @returns {Recordatorio[]} lista nueva, ordenada.
 */
export function ordenarPorMomento(recordatorios) {
  return [...recordatorios].sort((a, b) => {
    const porFecha = comparar(a.fecha, b.fecha);
    if (porFecha !== 0) {
      return porFecha;
    }

    return (a.hora ?? HORA_POR_DEFECTO).localeCompare(b.hora ?? HORA_POR_DEFECTO);
  });
}

/**
 * Cuenta los cobros que tocan hoy, para el indicador de la barra de navegación.
 *
 * @param {Recordatorio[]} recordatorios
 * @param {string} hoyIso
 * @returns {number}
 */
export function contarDeHoy(recordatorios, hoyIso) {
  return recordatorios.filter((recordatorio) => esDeHoy(recordatorio, hoyIso)).length;
}
