/**
 * Inventario: existencias y sus movimientos.
 *
 * El stock nunca puede quedar negativo. La aplicación registra ventas de un
 * negocio pequeño donde la mercadería está físicamente en casa: si el sistema
 * dice −3 unidades, el dato es falso y ya no sirve para nada.
 */

/** Debajo de esta cantidad se considera que quedan pocas unidades. */
export const UMBRAL_STOCK_BAJO = 5;

/** Categorías del catálogo. Única fuente: la interfaz las lee de aquí. */
export const CATEGORIAS = Object.freeze([
  'Joyería',
  'Maquillaje',
  'Sandalias',
  'Perfumes',
  'Otro',
]);

/** Estado de existencias, para el indicador de color del catálogo. */
export const NIVEL_STOCK = Object.freeze({
  AGOTADO: 'agotado',
  BAJO: 'bajo',
  DISPONIBLE: 'disponible',
});

/**
 * Indica si hay unidades suficientes para vender.
 *
 * @param {number} stockActual
 * @param {number} cantidad
 * @returns {boolean}
 */
export function hayStockSuficiente(stockActual, cantidad) {
  validarStock(stockActual);
  return stockActual >= cantidad;
}

/**
 * Descuenta unidades por una venta.
 *
 * @param {number} stockActual
 * @param {number} cantidad
 * @returns {number} stock resultante.
 * @throws {RangeError} si no hay unidades suficientes. Falla en vez de dejarlo
 *   en cero: vender lo que no existe es un error que la usuaria debe ver.
 */
export function descontarStock(stockActual, cantidad) {
  validarStock(stockActual);

  if (!hayStockSuficiente(stockActual, cantidad)) {
    throw new RangeError(
      `Stock insuficiente: hay ${stockActual} unidades y se piden ${cantidad}.`,
    );
  }

  return stockActual - cantidad;
}

/**
 * Corrige el stock a mano, sumando o restando unidades.
 *
 * A diferencia de una venta, aquí sí se recorta en cero: es un ajuste de
 * conteo físico, y quitar más de lo que hay solo significa que no queda nada.
 *
 * @param {number} stockActual
 * @param {number} diferencia positiva para agregar, negativa para quitar.
 * @returns {number} stock resultante, nunca menor que cero.
 */
export function ajustarStock(stockActual, diferencia) {
  validarStock(stockActual);

  if (!Number.isInteger(diferencia)) {
    throw new TypeError(`El ajuste debe ser un entero: ${diferencia}`);
  }

  return Math.max(0, stockActual + diferencia);
}

/**
 * Clasifica el nivel de existencias.
 *
 * @param {number} stockActual
 * @returns {string} uno de NIVEL_STOCK.
 */
export function nivelDeStock(stockActual) {
  validarStock(stockActual);

  if (stockActual === 0) return NIVEL_STOCK.AGOTADO;
  if (stockActual <= UMBRAL_STOCK_BAJO) return NIVEL_STOCK.BAJO;
  return NIVEL_STOCK.DISPONIBLE;
}

/**
 * Comprueba que un stock sea válido.
 *
 * @param {number} stock
 * @throws {TypeError} si no es entero.
 * @throws {RangeError} si es negativo.
 */
export function validarStock(stock) {
  if (!Number.isInteger(stock)) {
    throw new TypeError(`El stock debe ser un entero: ${stock}`);
  }

  if (stock < 0) {
    throw new RangeError(`El stock no puede ser negativo: ${stock}`);
  }
}
