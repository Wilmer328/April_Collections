/**
 * Configuración de entorno.
 *
 * Los valores se resuelven en tiempo de compilación desde las variables
 * `VITE_*`, que Vite sustituye literalmente en el paquete final. En producción
 * las define Vercel; en local, un archivo `.env` que no se versiona.
 *
 * Por qué las credenciales no están escritas en este archivo: aunque la URL y
 * la anon key de Supabase son públicas por diseño —viajan al navegador en
 * cualquier aplicación Supabase y la protección real la dan las políticas RLS—,
 * fijarlas en el código ataría el repositorio a un entorno concreto. Con
 * variables, el mismo código sirve para producción, para las vistas previas de
 * Vercel y para desarrollo, cada uno apuntando a su propio proyecto.
 *
 * Lo que NUNCA puede llevar prefijo `VITE_` es la `service_role` key: todo lo
 * que empieza así se incrusta en el paquete que descarga el navegador.
 */

/**
 * Sobrescritura en tiempo de ejecución. Sirve para probar contra otro proyecto
 * sin recompilar: basta definir `window.__APP_CONFIG__` antes de los módulos.
 * Si no existe, mandan las variables de compilación.
 */
const enTiempoDeEjecucion = globalThis.__APP_CONFIG__ ?? {};

/**
 * Lee una variable, dando prioridad a la sobrescritura de ejecución.
 *
 * @param {string} nombre clave dentro de window.__APP_CONFIG__
 * @param {string|undefined} valorDeCompilacion
 * @returns {string}
 */
function leer(nombre, valorDeCompilacion) {
  return (enTiempoDeEjecucion[nombre] ?? valorDeCompilacion ?? '').trim();
}

export const SUPABASE_URL = leer('SUPABASE_URL', import.meta.env?.VITE_SUPABASE_URL);

export const SUPABASE_ANON_KEY = leer(
  'SUPABASE_ANON_KEY',
  import.meta.env?.VITE_SUPABASE_ANON_KEY,
);

/**
 * Indica si hay credenciales suficientes para hablar con Supabase.
 *
 * Las pantallas la consultan para mostrar un estado honesto —«falta
 * configurar»— en lugar de fallar con un error de red incomprensible.
 *
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
