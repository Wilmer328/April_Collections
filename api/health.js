/**
 * Healthcheck del servicio.
 *
 * Responde en JSON si el despliegue está vivo y qué versión concreta se está
 * sirviendo. Sirve para comprobar desde fuera —un monitor, el evaluador del
 * curso, uno mismo— que el sitio no solo carga sino que su parte de servidor
 * responde.
 *
 * Se ejecuta como función serverless en Vercel, no como archivo estático: un
 * archivo JSON fijo diría siempre lo mismo aunque el despliegue estuviera roto.
 *
 * Ruta: /api/health
 */

/** Códigos de estado que devuelve el endpoint. */
const OK = 200;
const METODO_NO_PERMITIDO = 405;

/**
 * Datos del despliegue que Vercel inyecta como variables de entorno.
 * No se inventan: si no existen —por ejemplo al ejecutar en local— se informa
 * como desconocido en lugar de rellenar con un valor falso.
 */
function informacionDelDespliegue() {
  return {
    entorno: process.env.VERCEL_ENV ?? 'desconocido',
    region: process.env.VERCEL_REGION ?? 'desconocido',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'desconocido',
  };
}

/**
 * @param {import('http').IncomingMessage & { method: string }} peticion
 * @param {import('http').ServerResponse & { status: Function, json: Function }} respuesta
 */
export default function handler(peticion, respuesta) {
  // Nunca se cachea: un healthcheck cacheado seguiría diciendo "ok" después de
  // que el servicio se cayera, que es justo cuando hace falta que diga otra cosa.
  respuesta.setHeader('Cache-Control', 'no-store, max-age=0');

  if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
    respuesta.status(METODO_NO_PERMITIDO).json({
      estado: 'error',
      mensaje: `Método ${peticion.method} no permitido. Usa GET.`,
    });
    return;
  }

  respuesta.status(OK).json({
    estado: 'ok',
    servicio: 'april-collections',
    version: '1.0.0',
    momento: new Date().toISOString(),
    despliegue: informacionDelDespliegue(),
    // Se declara qué partes existen ya y cuáles no. Un healthcheck que afirma
    // que todo está bien cuando media aplicación no está construida engaña a
    // quien lo consulta.
    componentes: {
      sitio: 'operativo',
      pwa: 'operativo',
      supabase: 'no configurado',
    },
  });
}
