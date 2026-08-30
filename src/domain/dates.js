/**
 * Fechas en calendario local.
 *
 * Corrige dos errores reales de la versión anterior, ambos causados por mezclar
 * el calendario UTC con el local. Honduras está en UTC−6.
 *
 *   1. `new Date('2026-08-01')` se interpreta como medianoche UTC, y
 *      `.getMonth()` la devuelve en hora local: las 18:00 del 31 de julio. El
 *      resultado era que TODA venta del día 1 de cada mes se contaba en el mes
 *      anterior, y el resumen del mes salía mal.
 *
 *   2. `new Date().toISOString().slice(0, 10)` devuelve la fecha UTC. Después
 *      de las 18:00 hora de Honduras ya es el día siguiente en UTC, así que la
 *      aplicación creía que había cambiado el día: "cobrado hoy" se ponía en
 *      cero y los recordatorios del día dejaban de aparecer.
 *
 * La solución aquí es no construir objetos Date a partir de cadenas. Una fecha
 * de calendario ("el 1 de agosto") no tiene hora ni zona: es texto con
 * estructura. Se trata como tal.
 */

/** Formato de fecha de calendario usado en todo el dominio. */
const PATRON_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha de calendario en formato YYYY-MM-DD.
 *
 * @typedef {string} FechaIso
 */

/**
 * Convierte un objeto Date a fecha de calendario local.
 *
 * @param {Date} fecha
 * @returns {FechaIso}
 */
export function aIsoLocal(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new TypeError('Se esperaba un objeto Date válido.');
  }

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

/**
 * Fecha de hoy según el calendario del usuario, no según UTC.
 *
 * @param {Date} [ahora] inyectable para poder probarlo con una fecha fija.
 * @returns {FechaIso}
 */
export function hoyLocal(ahora = new Date()) {
  return aIsoLocal(ahora);
}

/**
 * Descompone una fecha de calendario sin pasar por Date.
 *
 * @param {FechaIso} iso
 * @returns {{ anio: number, mes: number, dia: number }} `mes` va de 1 a 12.
 * @throws {TypeError} si el formato no es YYYY-MM-DD.
 */
export function partesDe(iso) {
  if (typeof iso !== 'string' || !PATRON_ISO.test(iso)) {
    throw new TypeError(`Fecha inválida, se esperaba YYYY-MM-DD: ${iso}`);
  }

  const [anio, mes, dia] = iso.split('-').map(Number);

  return { anio, mes, dia };
}

/**
 * Indica si una fecha cae dentro de un mes concreto.
 *
 * @param {FechaIso} iso
 * @param {number} mes de 1 a 12.
 * @param {number} anio
 * @returns {boolean}
 */
export function perteneceAlMes(iso, mes, anio) {
  const partes = partesDe(iso);
  return partes.mes === mes && partes.anio === anio;
}

/**
 * Compara dos fechas de calendario.
 *
 * El formato YYYY-MM-DD ordena igual como texto que como fecha, así que basta
 * comparar cadenas. Sin objetos Date no hay zona horaria que pueda desviar el
 * resultado.
 *
 * @param {FechaIso} a
 * @param {FechaIso} b
 * @returns {number} negativo si a < b, 0 si son iguales, positivo si a > b.
 */
export function comparar(a, b) {
  partesDe(a);
  partesDe(b);

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Indica si una fecha es anterior a otra.
 *
 * @param {FechaIso} iso
 * @param {FechaIso} referencia
 * @returns {boolean}
 */
export function esAnteriorA(iso, referencia) {
  return comparar(iso, referencia) < 0;
}
