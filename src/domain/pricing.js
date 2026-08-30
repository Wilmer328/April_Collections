/**
 * Cálculo de precios y márgenes.
 *
 * Es el corazón del negocio: la usuaria compra a un costo y decide cuánto
 * quiere ganar. Las dos operaciones son inversas y la interfaz las usa en las
 * dos direcciones — escribir el margen calcula el precio, y escribir el precio
 * calcula el margen.
 */

import { validarCentavos } from './money.js';

/** Margen sugerido cuando la usuaria no indica otro. */
export const MARGEN_POR_DEFECTO = 30;

/**
 * Precio de venta a partir del costo y el margen deseado.
 *
 *   precio = costo × (1 + margen / 100)
 *
 * @param {number} costoCentavos
 * @param {number} margenPorcentaje por ejemplo 30 para un 30 %.
 * @returns {number} precio en centavos, redondeado al centavo más cercano.
 */
export function precioDesdeMargen(costoCentavos, margenPorcentaje) {
  validarCentavos(costoCentavos);
  validarPorcentaje(margenPorcentaje);

  return Math.round(costoCentavos * (1 + margenPorcentaje / 100));
}

/**
 * Margen implícito en un precio de venta.
 *
 *   margen = (precio − costo) / costo × 100
 *
 * @param {number} costoCentavos
 * @param {number} precioCentavos
 * @returns {number} porcentaje. Devuelve 0 si el costo es 0, porque sobre un
 *   costo nulo el margen no está definido y no tiene sentido devolver infinito.
 */
export function margenDesdePrecio(costoCentavos, precioCentavos) {
  validarCentavos(costoCentavos);
  validarCentavos(precioCentavos);

  if (costoCentavos === 0) {
    return 0;
  }

  return ((precioCentavos - costoCentavos) / costoCentavos) * 100;
}

/**
 * Ganancia por unidad vendida.
 *
 * @param {number} costoCentavos
 * @param {number} precioCentavos
 * @returns {number} centavos. Puede ser negativa si se vende por debajo del costo.
 */
export function gananciaUnitaria(costoCentavos, precioCentavos) {
  validarCentavos(costoCentavos);
  validarCentavos(precioCentavos);

  return precioCentavos - costoCentavos;
}

/**
 * Comprueba que un porcentaje sea utilizable en un cálculo.
 *
 * @param {number} porcentaje
 * @throws {TypeError} si no es un número finito.
 * @throws {RangeError} si es negativo: un margen negativo significaría vender
 *   con pérdida a propósito, que en esta aplicación es un error de captura.
 */
export function validarPorcentaje(porcentaje) {
  if (typeof porcentaje !== 'number' || !Number.isFinite(porcentaje)) {
    throw new TypeError(`Porcentaje inválido: ${porcentaje}`);
  }

  if (porcentaje < 0) {
    throw new RangeError(`El margen no puede ser negativo: ${porcentaje}`);
  }
}
