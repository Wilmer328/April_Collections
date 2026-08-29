/**
 * Cliente Supabase (singleton).
 *
 * Mientras el proyecto no tenga build step, supabase-js se carga desde CDN
 * con un import dinámico: así las páginas que no necesitan Supabase (la
 * landing) no descargan la librería, y una caída de red no rompe la carga
 * del resto de la aplicación.
 *
 * En la Etapa 0 este import pasa a ser `@supabase/supabase-js` desde
 * node_modules, que ya está declarado en package.json.
 */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_JS_VERSION,
  isSupabaseConfigured,
} from '../config/env.js';

const CDN_MODULE_URL = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_JS_VERSION}/+esm`;

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

  const { createClient } = await import(/* @vite-ignore */ CDN_MODULE_URL);

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
