/**
 * Negocios a los que pertenece quien ha iniciado sesión, y cuál está activo.
 *
 * Antes los datos colgaban de la persona y no hacía falta preguntar nada: lo
 * tuyo era tuyo. Ahora cuelgan del negocio, así que cada consulta necesita
 * saber sobre cuál se está trabajando.
 *
 * La mayoría de las personas pertenece a uno solo y nunca ve esta elección. La
 * existe porque quien administra el negocio real y además enseña la
 * demostración pertenece a dos.
 */

import { tabla, desenvolver } from './_comun.js';

const TABLA = 'miembros';

/** Dónde se recuerda el negocio elegido, por usuario. */
const CLAVE_ACTIVO = 'ac_negocio_activo_';

/** Negocio sobre el que se está trabajando ahora mismo. */
let activo = null;

/**
 * @typedef {{ id: string, nombre: string, rol: string }} Negocio
 */

/**
 * Negocios de quien ha iniciado sesión, con su rol en cada uno.
 *
 * Se consulta `miembros` y no `negocios`: la membresía es la que trae el rol, y
 * las políticas RLS solo devuelven las filas de esta persona.
 *
 * @returns {Promise<Negocio[]>}
 */
export async function listarMios() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase
      .from(TABLA)
      .select('rol, negocios ( id, nombre )')
      .order('creado_en'),
    'cargar tus negocios',
  );

  return filas
    .filter((fila) => fila.negocios)
    .map((fila) => ({ id: fila.negocios.id, nombre: fila.negocios.nombre, rol: fila.rol }));
}

/**
 * Fija el negocio activo y lo recuerda para la próxima visita.
 *
 * @param {Negocio} negocio
 * @param {string} idUsuario
 */
export function fijarActivo(negocio, idUsuario) {
  activo = negocio;

  try {
    localStorage.setItem(CLAVE_ACTIVO + idUsuario, negocio.id);
  } catch {
    // Si el navegador no deja recordar, solo se pierde la comodidad: en la
    // proxima visita se elige el primero.
  }
}

/**
 * Negocio activo, o null si todavía no se ha elegido.
 *
 * @returns {Negocio | null}
 */
export function obtenerActivo() {
  return activo;
}

/**
 * Elige con qué negocio arrancar: el recordado de la última vez si sigue
 * estando disponible, y si no el primero.
 *
 * @param {Negocio[]} disponibles
 * @param {string} idUsuario
 * @returns {Negocio | null}
 */
export function elegirInicial(disponibles, idUsuario) {
  if (disponibles.length === 0) {
    return null;
  }

  let recordado = null;

  try {
    recordado = localStorage.getItem(CLAVE_ACTIVO + idUsuario);
  } catch {
    recordado = null;
  }

  // Se comprueba que siga perteneciendo a él: pudieron haberle retirado el
  // acceso desde la última visita.
  const elegido = disponibles.find((n) => n.id === recordado) ?? disponibles[0];

  fijarActivo(elegido, idUsuario);

  return elegido;
}

/**
 * Indica si el rol en el negocio activo permite modificar datos.
 *
 * Es solo para la interfaz: la barrera real son las políticas RLS, que
 * rechazan la escritura de un lector aunque se manipule el navegador.
 *
 * @returns {boolean}
 */
export function puedeEscribir() {
  return activo?.rol === 'propietaria' || activo?.rol === 'administrador';
}
