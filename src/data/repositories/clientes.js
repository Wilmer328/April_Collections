/**
 * Repositorio de clientas.
 *
 * La aplicación las maneja como `{ id, nombre, dni, tel }`; la base guarda la
 * columna como `telefono`. La traducción se hace aquí para no esparcir el
 * detalle por la interfaz.
 */

import { tabla, desenvolver, idDelDuenio } from './_comun.js';

const TABLA = 'clientes';

/**
 * @typedef {{ id: string, nombre: string, dni: string, tel: string }} Cliente
 */

/**
 * Pasa una fila de la base a la forma que usa la aplicación.
 *
 * @param {object} fila
 * @returns {Cliente}
 */
function desdeBase(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    // La base guarda null cuando no hay dato; la interfaz espera cadena vacía.
    dni: fila.dni ?? '',
    tel: fila.telefono ?? '',
  };
}

/**
 * Lista las clientas, de la más reciente a la más antigua.
 *
 * @returns {Promise<Cliente[]>}
 */
export async function listar() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase.from(TABLA).select('*').order('creado_en', { ascending: false }),
    'cargar las clientas',
  );

  return filas.map(desdeBase);
}

/**
 * Registra una clienta.
 *
 * @param {{ nombre: string, dni?: string, tel?: string }} datos
 * @returns {Promise<Cliente>}
 */
export async function crear({ nombre, dni = '', tel = '' }) {
  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  const fila = desenvolver(
    await supabase
      .from(TABLA)
      .insert({
        owner_id,
        nombre: nombre.trim(),
        // Cadena vacía a null: el índice único de DNI es parcial y solo se
        // aplica a los que tienen valor. Con '' chocarían entre sí.
        dni: dni.trim() === '' ? null : dni.trim(),
        telefono: tel.trim() === '' ? null : tel.trim(),
      })
      .select()
      .single(),
    'guardar la clienta',
  );

  return desdeBase(fila);
}

/**
 * Actualiza los datos de una clienta.
 *
 * @param {string} id
 * @param {{ nombre?: string, dni?: string, tel?: string }} cambios
 * @returns {Promise<Cliente>}
 */
export async function actualizar(id, cambios) {
  const supabase = await tabla();

  const parche = {};
  if (cambios.nombre !== undefined) parche.nombre = cambios.nombre.trim();
  if (cambios.dni !== undefined) parche.dni = cambios.dni.trim() || null;
  if (cambios.tel !== undefined) parche.telefono = cambios.tel.trim() || null;

  const fila = desenvolver(
    await supabase.from(TABLA).update(parche).eq('id', id).select().single(),
    'actualizar la clienta',
  );

  return desdeBase(fila);
}

/**
 * Elimina una clienta.
 *
 * Falla si tiene ventas: la clave foránea de `ventas.cliente_id` es RESTRICT,
 * para no dejar ventas huérfanas ni perder el historial de cobros.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function eliminar(id) {
  const supabase = await tabla();

  desenvolver(await supabase.from(TABLA).delete().eq('id', id), 'eliminar la clienta');
}
