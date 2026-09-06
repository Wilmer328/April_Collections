/**
 * Gestión de sesión con Supabase Auth y proveedor Google.
 *
 * Esta capa aísla al resto de la aplicación de la API de Supabase: la UI
 * llama a estas funciones y nunca a `supabase.auth.*` directamente. Cuando
 * cambie el proveedor de identidad, solo cambia este archivo.
 */

import { getSupabaseClient } from '../data/supabaseClient.js';

const GOOGLE_PROVIDER = 'google';

/**
 * Datos de usuario que consume la interfaz. Se normalizan aquí para no
 * esparcir por la UI la forma concreta del objeto de Supabase.
 *
 * @typedef {{ id: string, email: string, nombre: string, avatarUrl: string }} UsuarioSesion
 */

/**
 * Convierte el usuario de Supabase al modelo que usa la interfaz.
 *
 * @param {object | null | undefined} user
 * @returns {UsuarioSesion | null}
 */
function mapUsuario(user) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? '',
    // Google puede enviar el nombre en `full_name` o en `name` según el scope.
    nombre: metadata.full_name ?? metadata.name ?? user.email ?? 'Usuario',
    avatarUrl: metadata.avatar_url ?? '',
  };
}

/**
 * Inicia el flujo OAuth con Google. Redirige fuera de la aplicación, por lo
 * que no retorna en el camino feliz.
 *
 * @param {string} redirectTo URL absoluta a la que Google devuelve al usuario.
 * @returns {Promise<void>}
 * @throws {Error} si Supabase rechaza la petición.
 */
export async function iniciarSesionConGoogle(redirectTo) {
  const supabase = await getSupabaseClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: GOOGLE_PROVIDER,
    options: { redirectTo },
  });

  if (error) {
    throw new Error(`No se pudo iniciar sesión con Google: ${error.message}`);
  }
}

/**
 * Inicia sesión con correo y contraseña.
 *
 * Existe solo para la cuenta de demostración del curso: la usuaria real entra
 * con Google. Ver ADR-0003.
 *
 * @param {string} correo
 * @param {string} contrasena
 * @returns {Promise<UsuarioSesion>}
 * @throws {Error} si las credenciales no son válidas.
 */
export async function iniciarSesionConCorreo(correo, contrasena) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });

  if (error) {
    // Supabase responde «Invalid login credentials» sin distinguir si falló el
    // correo o la contraseña. Es deliberado por su parte y aquí se respeta: si
    // se distinguiera, se podría averiguar qué correos tienen cuenta.
    throw new Error('Correo o contraseña incorrectos.');
  }

  return mapUsuario(data.user);
}

/**
 * Lee la sesión activa, si existe.
 *
 * @returns {Promise<UsuarioSesion | null>}
 */
export async function obtenerUsuarioActual() {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`No se pudo leer la sesión: ${error.message}`);
  }

  return mapUsuario(data.session?.user);
}

/**
 * Suscribe un callback a los cambios de sesión (login, logout, refresco).
 *
 * @param {(usuario: UsuarioSesion | null) => void} alCambiar
 * @returns {Promise<() => void>} función para cancelar la suscripción.
 */
export async function alCambiarSesion(alCambiar) {
  const supabase = await getSupabaseClient();

  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
    alCambiar(mapUsuario(sesion?.user));
  });

  return () => data.subscription.unsubscribe();
}

/**
 * Cierra la sesión y limpia el token almacenado.
 *
 * @returns {Promise<void>}
 */
export async function cerrarSesion() {
  const supabase = await getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`No se pudo cerrar la sesión: ${error.message}`);
  }
}
