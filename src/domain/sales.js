/**
 * Ventas, abonos y saldos.
 *
 * Una venta se paga al contado, con un abono inicial o completamente a
 * crédito. En los dos últimos casos la clienta va abonando en el tiempo, así
 * que el saldo pendiente es una función de la venta y sus abonos, nunca un
 * campo guardado: guardarlo permitiría que se desincronizara de los abonos.
 */

import { validarCentavos } from './money.js';

/** Formas de pago que acepta el negocio. */
export const TIPO_PAGO = Object.freeze({
  CONTADO: 'contado',
  ABONO: 'abono',
  CREDITO: 'credito',
});

/**
 * @typedef {{ nombre: string, precioCentavos: number, costoCentavos: number, cantidad: number }} ItemVenta
 * @typedef {{ montoCentavos: number, fecha: string }} Abono
 * @typedef {{ items: ItemVenta[], abonos?: Abono[] }} Venta
 */

/**
 * Importe total de una venta.
 *
 * @param {ItemVenta[]} items
 * @returns {number} centavos.
 */
export function totalVenta(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('Los items de la venta deben ser un arreglo.');
  }

  return items.reduce((suma, item) => {
    validarCentavos(item.precioCentavos);
    validarCantidad(item.cantidad);
    return suma + item.precioCentavos * item.cantidad;
  }, 0);
}

/**
 * Suma de lo abonado hasta ahora.
 *
 * @param {Abono[]} [abonos]
 * @returns {number} centavos.
 */
export function totalAbonado(abonos = []) {
  return abonos.reduce((suma, abono) => {
    validarCentavos(abono.montoCentavos);
    return suma + abono.montoCentavos;
  }, 0);
}

/**
 * Lo que la clienta todavía debe por esta venta.
 *
 * Nunca es negativo: si se abonó de más, la deuda es cero, no un saldo a
 * favor. Esta aplicación no maneja saldos a favor.
 *
 * @param {Venta} venta
 * @returns {number} centavos.
 */
export function saldoPendiente(venta) {
  const total = totalVenta(venta.items);
  const abonado = totalAbonado(venta.abonos);

  return Math.max(0, total - abonado);
}

/**
 * Indica si la venta está saldada.
 *
 * Con centavos enteros la comparación es exacta. La versión anterior usaba
 * `pendiente < 0.01` porque trabajaba con decimales.
 *
 * @param {Venta} venta
 * @returns {boolean}
 */
export function estaPagada(venta) {
  return saldoPendiente(venta) === 0;
}

/**
 * Ganancia de la venta: lo cobrado menos lo que costó la mercadería.
 *
 * Se calcula sobre el total de la venta, no sobre lo abonado: la ganancia se
 * reconoce cuando se vende, no cuando se cobra.
 *
 * @param {Venta} venta
 * @returns {number} centavos.
 */
export function gananciaVenta(venta) {
  const total = totalVenta(venta.items);

  const costo = venta.items.reduce((suma, item) => {
    validarCentavos(item.costoCentavos);
    return suma + item.costoCentavos * item.cantidad;
  }, 0);

  return total - costo;
}

/**
 * Abono que corresponde registrar al momento de crear la venta.
 *
 *   contado  -> se paga todo
 *   abono    -> lo que la clienta entregue, sin pasarse del total
 *   crédito  -> nada
 *
 * @param {{ tipoPago: string, totalCentavos: number, entregadoCentavos?: number }} datos
 * @returns {number} centavos.
 * @throws {RangeError} si el tipo de pago no es uno de los tres válidos.
 */
export function abonoInicial({ tipoPago, totalCentavos, entregadoCentavos = 0 }) {
  validarCentavos(totalCentavos);

  switch (tipoPago) {
    case TIPO_PAGO.CONTADO:
      return totalCentavos;

    case TIPO_PAGO.ABONO:
      validarCentavos(entregadoCentavos);
      return Math.min(Math.max(0, entregadoCentavos), totalCentavos);

    case TIPO_PAGO.CREDITO:
      return 0;

    default:
      throw new RangeError(`Tipo de pago desconocido: ${tipoPago}`);
  }
}

/**
 * Comprueba que una cantidad de producto sea utilizable.
 *
 * @param {number} cantidad
 * @throws {TypeError} si no es entero.
 * @throws {RangeError} si no es al menos 1.
 */
export function validarCantidad(cantidad) {
  if (!Number.isInteger(cantidad)) {
    throw new TypeError(`La cantidad debe ser un entero: ${cantidad}`);
  }

  if (cantidad < 1) {
    throw new RangeError(`La cantidad debe ser al menos 1: ${cantidad}`);
  }
}
