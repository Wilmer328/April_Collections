/**
 * Dinero, representado en centavos enteros.
 *
 * Por qué centavos y no números decimales: en JavaScript `0.1 + 0.2` da
 * 0.30000000000000004. Sobre un total de venta con varios abonos parciales el
 * error se acumula y una deuda saldada puede quedar en 0.004 lempiras
 * pendientes. La versión anterior de la aplicación lo parcheaba comparando
 * contra una tolerancia de 0.01 repetida en ocho sitios distintos.
 *
 * Con enteros el problema desaparece: `saldo === 0` es exacto y la tolerancia
 * deja de hacer falta.
 */

/** Un lempira son 100 centavos. */
export const CENTAVOS_POR_LEMPIRA = 100;

const MONEDA = 'L';

/**
 * Convierte una cantidad en lempiras a centavos enteros.
 *
 * @param {number|string} lempiras cantidad tal como la escribe el usuario.
 * @returns {number} centavos, redondeados al entero más cercano.
 * @throws {TypeError} si el valor no es un número finito.
 */
export function aCentavos(lempiras) {
  const valor = typeof lempiras === 'string' ? Number(lempiras) : lempiras;

  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new TypeError(`Cantidad de dinero inválida: ${lempiras}`);
  }

  return Math.round(valor * CENTAVOS_POR_LEMPIRA);
}

/**
 * Convierte centavos a lempiras. Solo para mostrar: no encadenar cálculos
 * sobre el resultado, o se recupera el problema de la coma flotante.
 *
 * @param {number} centavos
 * @returns {number}
 */
export function aLempiras(centavos) {
  validarCentavos(centavos);
  return centavos / CENTAVOS_POR_LEMPIRA;
}

/**
 * Da formato de moneda a una cantidad en centavos.
 *
 * @param {number} centavos
 * @returns {string} por ejemplo "L 1,250.00".
 */
export function formatear(centavos) {
  validarCentavos(centavos);

  const texto = Math.abs(aLempiras(centavos)).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const signo = centavos < 0 ? '-' : '';

  return `${signo}${MONEDA} ${texto}`;
}

/**
 * Comprueba que un valor sea una cantidad válida de centavos.
 *
 * @param {number} centavos
 * @throws {TypeError} si no es un entero finito.
 */
export function validarCentavos(centavos) {
  if (!Number.isInteger(centavos)) {
    throw new TypeError(`Los centavos deben ser un entero, se recibió: ${centavos}`);
  }
}
