/**
 * Utilidades compartidas por los repositorios.
 *
 * Un repositorio traduce entre dos formas de los mismos datos:
 *
 *   BASE          columnas en snake_case, dinero en centavos enteros
 *   APLICACIÓN    propiedades en camelCase, dinero en lempiras
 *
 * La conversión vive aquí, en la frontera, y no repartida por la interfaz. Así
 * la base guarda importes exactos y la pantalla sigue mostrando lempiras.
 */

import { getSupabaseClient } from '../supabaseClient.js';
import { aCentavos, aLempiras } from '../../domain/money.js';
import { obtenerActivo } from './negocios.js';

/**
 * Error de acceso a datos. Envuelve el error de Supabase para que la interfaz
 * no tenga que conocer su forma concreta.
 */
export class ErrorDeDatos extends Error {
  /**
   * @param {string} operacion qué se estaba haciendo, para el mensaje.
   * @param {{ message?: string }} causa error original de Supabase.
   */
  constructor(operacion, causa) {
    super(`No se pudo ${operacion}: ${causa?.message ?? 'error desconocido'}`);
    this.name = 'ErrorDeDatos';
    // Se conserva el error original completo: PostgREST devuelve en `details`,
    // `hint` y `code` qué restriccion se violo o qué politica rechazo la fila,
    // y sin eso solo queda un mensaje generico que no dice donde mirar.
    this.causa = causa;
    this.operacion = operacion;
  }
}

/**
 * Desenvuelve una respuesta de Supabase, lanzando si trae error.
 *
 * @template T
 * @param {{ data: T, error: object|null }} respuesta
 * @param {string} operacion
 * @returns {T}
 */
export function desenvolver({ data, error }, operacion) {
  if (error) {
    throw new ErrorDeDatos(operacion, error);
  }

  return data;
}

/**
 * Devuelve el cliente listo para consultar.
 *
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function tabla() {
  return getSupabaseClient();
}

/**
 * Identificador del negocio sobre el que se está trabajando.
 *
 * Es lo que decide el acceso: las políticas RLS comprueban que quien consulta
 * sea miembro de ese negocio. Enviarlo aquí no es la seguridad —la política lo
 * verifica igualmente en el servidor— pero sin él la fila se rechaza.
 *
 * @returns {string}
 * @throws {ErrorDeDatos} si todavía no se ha elegido negocio.
 */
export function idDelNegocio() {
  const negocio = obtenerActivo();

  if (!negocio) {
    throw new ErrorDeDatos('identificar el negocio', { message: 'sin negocio activo' });
  }

  return negocio.id;
}

/**
 * Identificador del usuario autenticado.
 *
 * Ya no decide el acceso: se guarda en `owner_id` como rastro de quién creó
 * cada fila, que es útil cuando varias personas trabajan sobre el mismo
 * negocio.
 *
 * @returns {Promise<string>}
 * @throws {ErrorDeDatos} si no hay sesión.
 */
export async function idDelDuenio() {
  const supabase = await tabla();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new ErrorDeDatos('identificar la sesión', error ?? { message: 'sin sesión activa' });
  }

  return data.session.user.id;
}

/**
 * Convierte lempiras a centavos para guardar.
 *
 * @param {number|string} lempiras
 * @returns {number}
 */
export function aBase(lempiras) {
  return aCentavos(lempiras || 0);
}

/**
 * Convierte centavos a lempiras para mostrar.
 *
 * @param {number} centavos
 * @returns {number}
 */
export function aApp(centavos) {
  return aLempiras(centavos ?? 0);
}
