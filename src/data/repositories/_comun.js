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
    this.causa = causa;
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
 * Identificador del usuario autenticado.
 *
 * Se necesita para rellenar `owner_id` al insertar. Las políticas RLS lo
 * comprueban igualmente en el servidor: enviarlo aquí no es la seguridad, solo
 * evita que la inserción sea rechazada por la política.
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
