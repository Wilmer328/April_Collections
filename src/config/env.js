/**
 * Configuración de entorno.
 *
 * IMPORTANTE — por qué los valores están vacíos:
 * este archivo se versiona en Git, así que nunca debe contener credenciales.
 * Los valores reales se inyectan en tiempo de ejecución mediante
 * `window.__APP_CONFIG__`, que define un archivo `config.js` NO versionado
 * (ver `config.example.js` en la raíz del proyecto).
 *
 * La URL y la anon key de Supabase son públicas por diseño: viajan al
 * navegador en cualquier aplicación Supabase y la protección real la dan las
 * políticas RLS, no el secreto de la clave. Aun así se mantienen fuera del
 * repositorio para no fijar el entorno dentro del código.
 *
 * En la Etapa 0 (migración a Vite) esta lectura se reemplaza por
 * `import.meta.env.VITE_SUPABASE_URL`, resuelta en tiempo de build.
 */

const runtimeConfig = globalThis.__APP_CONFIG__ ?? {};

export const SUPABASE_URL = runtimeConfig.SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = runtimeConfig.SUPABASE_ANON_KEY ?? '';

/** Versión de supabase-js fijada; sin build step se carga desde CDN. */
export const SUPABASE_JS_VERSION = '2.112.4';

/**
 * Indica si hay credenciales suficientes para hablar con Supabase.
 * Las pantallas la consultan para mostrar un estado honesto en vez de
 * fallar con un error de red incomprensible.
 *
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;
}
