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

import { SUPABASE_URL, SUPABASE_KEY, isSupabaseConfigured } from '../config/env.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let cachedClient = null;

/**
 * Error de configuración: Supabase no tiene credenciales cargadas.
 * Se distingue de un fallo de red para poder darle al usuario el mensaje
 * correcto en pantalla.
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no está configurado: falta la URL o la clave pública del proyecto.');
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

  cachedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      // Mantiene la sesión entre recargas y la renueva sola antes de expirar.
      persistSession: true,
      autoRefreshToken: true,
      // Necesario para leer el token que Google devuelve en la URL de retorno.
      detectSessionInUrl: true,
    },
  });

  sincronizarMarcaDeSesion(cachedClient);

  return cachedClient;
}

/** Nombre de la marca que lee el middleware para proteger /panel. */
const COOKIE_SESION = 'ac_sesion';

/** Duración de la marca. Se renueva en cada cambio de sesión. */
const HORAS_DE_VIGENCIA = 12;

/**
 * Mantiene una cookie que indica si hay sesión abierta.
 *
 * El middleware del servidor no puede leer el token: Supabase lo guarda en
 * localStorage, que solo existe en el navegador. Esta cookie es la señal
 * mínima que sí viaja en la petición.
 *
 * NO es una credencial: no lleva el token ni nada firmado, y por eso se marca
 * SameSite=Lax y sin HttpOnly —tiene que poder escribirla el propio cliente—.
 * Solo sirve para que el servidor no entregue el documento del área privada a
 * quien claramente no ha iniciado sesión. Los datos los sigue protegiendo RLS.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
function sincronizarMarcaDeSesion(supabase) {
  const escribir = (haySesion) => {
    const seguro = window.location.protocol === 'https:' ? '; Secure' : '';
    const vigencia = haySesion ? `; Max-Age=${HORAS_DE_VIGENCIA * 3600}` : '; Max-Age=0';

    document.cookie = `${COOKIE_SESION}=${haySesion ? '1' : '0'}; Path=/; SameSite=Lax${seguro}${vigencia}`;
  };

  supabase.auth.onAuthStateChange((_evento, sesion) => escribir(Boolean(sesion)));

  // El primer aviso de onAuthStateChange llega de forma asíncrona; se consulta
  // la sesión de entrada para no dejar la cookie desfasada mientras tanto.
  supabase.auth.getSession().then(({ data }) => escribir(Boolean(data.session)));
}
