/**
 * Control de acceso al portal privado, en el borde.
 *
 * POR QUE EXISTE
 * `/panel` es una página estática: sin esto, el servidor la entrega a
 * cualquiera con HTTP 200 y es el JavaScript del navegador el que decide si
 * expulsar o no. Eso significa que quien pida la página sin navegador —un
 * rastreador, un `curl`, alguien con JavaScript desactivado— recibe el
 * documento completo. No hay datos del negocio dentro, pero sí la estructura
 * del área privada, y responder 200 a un anónimo es la respuesta equivocada.
 *
 * Este middleware se ejecuta en el servidor de Vercel, antes de servir nada.
 * Sin sesión responde 302 al inicio de sesión, sin cuerpo.
 *
 * QUE PROTEGE Y QUE NO
 * La cookie que comprueba es solo una MARCA de que hay sesión, no una
 * credencial: no lleva el token y no se valida criptográficamente. Alguien
 * podría ponérsela a mano y recibir el documento.
 *
 * Eso es aceptable porque el documento no contiene nada: los datos del negocio
 * llegan de Supabase, y ahí la barrera son las políticas RLS, que se evalúan
 * en el servidor contra un JWT firmado. Este middleware evita entregar el área
 * privada a quien pasa por delante; RLS impide leer datos ajenos.
 *
 * Se separan a propósito: una marca en cookie no puede sustituir a RLS, y RLS
 * no puede evitar que se sirva un documento estático.
 */

/** Solo intercepta el portal privado; el resto del sitio es público. */
export const config = {
  matcher: ['/panel', '/panel.html'],
};

/** Nombre de la marca que deja la aplicación al iniciar sesión. */
const COOKIE_SESION = 'ac_sesion';

const REDIRECCION_TEMPORAL = 302;

/**
 * @param {Request & { cookies: { get: (nombre: string) => { value: string } | undefined } }} peticion
 * @returns {Response | undefined} respuesta de redirección, o nada para seguir.
 */
export default function middleware(peticion) {
  const marca = peticion.cookies.get(COOKIE_SESION);

  if (marca?.value === '1') {
    return undefined;
  }

  const destino = new URL('/login', peticion.url);

  return new Response(null, {
    status: REDIRECCION_TEMPORAL,
    headers: {
      Location: destino.toString(),
      // Sin cachear: si se guardara, un visitante con sesión recibiría después
      // la redirección guardada para el anónimo.
      'Cache-Control': 'no-store',
    },
  });
}
