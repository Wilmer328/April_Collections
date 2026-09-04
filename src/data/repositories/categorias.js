/**
 * Repositorio de categorías del catálogo.
 *
 * La aplicación las maneja como una simple lista de nombres, que es todo lo
 * que necesita para pintar el desplegable y los filtros. La base les da un id
 * propio para poder renombrarlas más adelante sin tocar los productos.
 */

import { tabla, desenvolver, idDelDuenio } from './_comun.js';
import { CATEGORIAS_INICIALES } from '../../domain/categories.js';

const TABLA = 'categorias';

/**
 * Lista los nombres de las categorías, en el orden en que se crearon.
 *
 * @returns {Promise<string[]>}
 */
export async function listar() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase.from(TABLA).select('nombre').order('creado_en'),
    'cargar las categorías',
  );

  return filas.map((fila) => fila.nombre);
}

/**
 * Agrega una categoría.
 *
 * @param {string} nombre
 * @returns {Promise<string>} el nombre guardado.
 */
export async function crear(nombre) {
  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  const fila = desenvolver(
    await supabase.from(TABLA).insert({ owner_id, nombre: nombre.trim() }).select().single(),
    'guardar la categoría',
  );

  return fila.nombre;
}

/**
 * Elimina una categoría por su nombre.
 *
 * Quien decide si se puede borrar es el dominio (`categories.js`), que exige
 * que no tenga productos. Aquí solo se ejecuta.
 *
 * @param {string} nombre
 * @returns {Promise<void>}
 */
export async function eliminar(nombre) {
  const supabase = await tabla();

  desenvolver(await supabase.from(TABLA).delete().eq('nombre', nombre), 'eliminar la categoría');
}

/**
 * Crea las categorías iniciales si la cuenta todavía no tiene ninguna.
 *
 * Ocurre la primera vez que alguien entra: sin esto el catálogo arrancaría sin
 * ningún rubro donde clasificar un producto.
 *
 * @returns {Promise<string[]>} la lista resultante.
 */
export async function asegurarIniciales() {
  const existentes = await listar();

  if (existentes.length > 0) {
    return existentes;
  }

  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  desenvolver(
    await supabase
      .from(TABLA)
      .insert(CATEGORIAS_INICIALES.map((nombre) => ({ owner_id, nombre }))),
    'crear las categorías iniciales',
  );

  return [...CATEGORIAS_INICIALES];
}
