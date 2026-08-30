/**
 * Cuándo avisar de un cobro.
 *
 * Tres reglas de producto:
 *
 *   1. El aviso llega ANTES de la hora prometida, no a la hora exacta. De nada
 *      sirve enterarse a las 7:00 de que había que cobrar a las 7:00.
 *
 *   2. El aviso insiste hasta que la usuaria lo ve. La versión anterior lo
 *      marcaba como notificado en cuanto lo mostraba, así que si la aplicación
 *      estaba cerrada en ese minuto exacto el aviso se perdía para siempre.
 *
 *   3. Insistir no es acosar: entre repeticiones pasa un rato.
 *
 * Todo aquí es cálculo puro sobre fechas. Quién muestra el aviso y por qué
 * medio es decisión de la capa de interfaz.
 */

import { partesDe } from './dates.js';
import { estaPendiente } from './reminders.js';

/** Cuánto antes de la hora prometida se avisa. */
export const MINUTOS_ANTICIPACION = 30;

/** Cuánto se espera antes de volver a insistir con el mismo aviso. */
export const MINUTOS_ENTRE_INSISTENCIAS = 10;

const MILISEGUNDOS_POR_MINUTO = 60_000;
const HORA_POR_DEFECTO = '09:00';

/**
 * Combina fecha de calendario y hora en un instante del reloj local.
 *
 * Se construye con `new Date(anio, mes, dia, ...)`, que interpreta los valores
 * en hora local. Pasarle la cadena directamente los leería como UTC y en
 * Honduras el aviso se correría seis horas.
 *
 * @param {string} fechaIso YYYY-MM-DD
 * @param {string} [hora] HH:MM
 * @returns {Date}
 */
export function momentoDe(fechaIso, hora = HORA_POR_DEFECTO) {
  const { anio, mes, dia } = partesDe(fechaIso);
  const [horas, minutos] = String(hora || HORA_POR_DEFECTO).split(':').map(Number);

  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) {
    throw new TypeError(`Hora inválida, se esperaba HH:MM: ${hora}`);
  }

  return new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
}

/**
 * Instante en que debe sonar el aviso de un recordatorio.
 *
 * @param {object} recordatorio
 * @returns {Date}
 */
export function momentoDeAviso(recordatorio) {
  const prometido = momentoDe(recordatorio.fecha, recordatorio.hora);

  return new Date(prometido.getTime() - MINUTOS_ANTICIPACION * MILISEGUNDOS_POR_MINUTO);
}

/**
 * Indica si toca avisar de este recordatorio en este momento.
 *
 * @param {object} recordatorio
 * @param {Date} [ahora] inyectable para poder probarlo con un reloj fijo.
 * @returns {boolean}
 */
export function debeAvisar(recordatorio, ahora = new Date()) {
  // Ya se cobró o se descartó: no hay nada que recordar.
  if (!estaPendiente(recordatorio)) {
    return false;
  }

  // La usuaria ya lo vio: deja de insistir.
  if (recordatorio.visto) {
    return false;
  }

  // Todavía no es hora.
  if (ahora.getTime() < momentoDeAviso(recordatorio).getTime()) {
    return false;
  }

  // Primera vez que toca.
  if (!recordatorio.avisadoEn) {
    return true;
  }

  // Ya se avisó: se insiste solo si pasó el intervalo. Así el aviso sigue
  // presente hasta que lo vea, sin repetirse cada pocos segundos.
  const desdeElUltimo = ahora.getTime() - new Date(recordatorio.avisadoEn).getTime();

  return desdeElUltimo >= MINUTOS_ENTRE_INSISTENCIAS * MILISEGUNDOS_POR_MINUTO;
}

/**
 * Recordatorios que toca avisar ahora, del más urgente al menos.
 *
 * @param {object[]} recordatorios
 * @param {Date} [ahora]
 * @returns {object[]}
 */
export function pendientesDeAvisar(recordatorios, ahora = new Date()) {
  return recordatorios
    .filter((recordatorio) => debeAvisar(recordatorio, ahora))
    .sort((a, b) => momentoDeAviso(a).getTime() - momentoDeAviso(b).getTime());
}

/**
 * Minutos que faltan para la hora prometida. Negativo si ya pasó.
 *
 * @param {object} recordatorio
 * @param {Date} [ahora]
 * @returns {number}
 */
export function minutosRestantes(recordatorio, ahora = new Date()) {
  const prometido = momentoDe(recordatorio.fecha, recordatorio.hora);

  return Math.round((prometido.getTime() - ahora.getTime()) / MILISEGUNDOS_POR_MINUTO);
}

/**
 * Frase que describe cuándo es el cobro, para el cuerpo del aviso.
 *
 * @param {object} recordatorio
 * @param {Date} [ahora]
 * @returns {string}
 */
export function describirMomento(recordatorio, ahora = new Date()) {
  const faltan = minutosRestantes(recordatorio, ahora);

  if (faltan < 0) {
    return `estaba para las ${recordatorio.hora}`;
  }

  if (faltan === 0) {
    return 'es ahora mismo';
  }

  if (faltan < 60) {
    return `es en ${faltan} minuto${faltan === 1 ? '' : 's'}`;
  }

  return `es a las ${recordatorio.hora}`;
}
