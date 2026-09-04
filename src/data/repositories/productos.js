/**
 * Repositorio de productos del catálogo.
 *
 * La base guarda costo y precio en centavos enteros; la aplicación los maneja
 * en lempiras. La conversión ocurre en las dos direcciones aquí mismo.
 */

import { tabla, desenvolver, idDelDuenio, aBase, aApp } from './_comun.js';

const TABLA = 'productos';

/**
 * @typedef {{ id: string, nombre: string, categoria: string, costo: number, precio: number, stock: number }} Producto
 */

/**
 * @param {object} fila
 * @returns {Producto}
 */
function desdeBase(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    categoria: fila.categoria,
    costo: aApp(fila.costo_centavos),
    precio: aApp(fila.precio_centavos),
    stock: fila.stock,
  };
}

/**
 * Lista el catálogo por orden alfabético, que es como se busca un producto.
 *
 * @returns {Promise<Producto[]>}
 */
export async function listar() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase.from(TABLA).select('*').order('nombre'),
    'cargar el catálogo',
  );

  return filas.map(desdeBase);
}

/**
 * Agrega un producto.
 *
 * @param {{ nombre: string, categoria: string, costo?: number, precio?: number, stock?: number }} datos
 * @returns {Promise<Producto>}
 */
export async function crear({ nombre, categoria, costo = 0, precio = 0, stock = 0 }) {
  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  const fila = desenvolver(
    await supabase
      .from(TABLA)
      .insert({
        owner_id,
        nombre: nombre.trim(),
        categoria,
        costo_centavos: aBase(costo),
        precio_centavos: aBase(precio),
        stock: Math.max(0, Math.trunc(stock)),
      })
      .select()
      .single(),
    'guardar el producto',
  );

  return desdeBase(fila);
}

/**
 * Actualiza un producto.
 *
 * @param {string} id
 * @param {{ nombre?: string, categoria?: string, costo?: number, precio?: number, stock?: number }} cambios
 * @returns {Promise<Producto>}
 */
export async function actualizar(id, cambios) {
  const supabase = await tabla();

  const parche = {};
  if (cambios.nombre !== undefined) parche.nombre = cambios.nombre.trim();
  if (cambios.categoria !== undefined) parche.categoria = cambios.categoria;
  if (cambios.costo !== undefined) parche.costo_centavos = aBase(cambios.costo);
  if (cambios.precio !== undefined) parche.precio_centavos = aBase(cambios.precio);
  if (cambios.stock !== undefined) parche.stock = Math.max(0, Math.trunc(cambios.stock));

  const fila = desenvolver(
    await supabase.from(TABLA).update(parche).eq('id', id).select().single(),
    'actualizar el producto',
  );

  return desdeBase(fila);
}

/**
 * Fija las existencias de un producto.
 *
 * Recibe el valor final ya calculado, no el incremento: quien decide cuánto
 * queda es el dominio (`inventory.js`), no la base.
 *
 * @param {string} id
 * @param {number} stock
 * @returns {Promise<Producto>}
 */
export async function fijarStock(id, stock) {
  return actualizar(id, { stock });
}

/**
 * Elimina un producto.
 *
 * Las líneas de venta que lo referencian NO se borran: su `producto_id` queda
 * en null y conservan el nombre y el precio con que se vendió. El historial no
 * debe cambiar porque hoy se retire un artículo del catálogo.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function eliminar(id) {
  const supabase = await tabla();

  desenvolver(await supabase.from(TABLA).delete().eq('id', id), 'eliminar el producto');
}
