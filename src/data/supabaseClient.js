/**
 * Cliente Supabase (singleton).
 *
 * La librería se importa del paquete de node_modules, no de un CDN: así el
 * código que llega al navegador viene todo del propio dominio, lo que permite
 * declarar una Content-Security-Policy con `script-src 'self'` sin
 * excepciones, y elimina la dependencia de que un tercero esté disponible.
 *
 * El import es dinámico para que las páginas que no usan Supabase —la
 * landing— no descarguen la librería.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../config/env.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let cachedClient = null;

/**
 * Error de configuración: Supabase no tiene credenciales cargadas.
 * Se distingue de un fallo de red para poder darle al usuario el mensaje
 * correcto en pantalla.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no está configurado: falta SUPABASE_URL o SUPABASE_ANON_KEY.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

/**
 * Devuelve el cliente Supabase, creándolo la primera vez.
 *
 * @throws {SupabaseNotConfiguredError} si faltan las credenciales.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }

  if (cachedClient) {
    return cachedClient;
  }

  const { createClient } = await import('@supabase/supabase-js');

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Mantiene la sesión entre recargas y la renueva sola antes de expirar.
      persistSession: true,
      autoRefreshToken: true,
      // Necesario para leer el token que Google devuelve en la URL de retorno.
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}
