/*
 * Service Worker de April Collections.
 *
 * Código propio y deliberadamente corto: tiene que poder explicarse línea por
 * línea. No usa Workbox ni ninguna librería de generación automática.
 *
 * QUÉ RESUELVE
 * El negocio se administra desde un teléfono, muchas veces en la calle o en
 * casa de una clienta, donde la señal falla. Sin service worker, abrir la
 * aplicación sin conexión da la pantalla de error del navegador, aunque los
 * datos estén guardados en el propio dispositivo.
 *
 * ESTRATEGIA
 * Dos comportamientos según lo que se pida:
 *
 *   Navegación (abrir una página)  -> red primero, caché si falla.
 *     Así se ve la versión nueva en cuanto hay señal, y sigue abriendo sin
 *     ella. Al revés —caché primero— la usuaria podría quedarse semanas con
 *     una versión antigua sin enterarse.
 *
 *   Recursos (JS, CSS, iconos)     -> caché primero, y se actualiza detrás.
 *     Llevan huella en el nombre y no cambian nunca bajo la misma URL, así
 *     que servirlos desde caché es instantáneo y siempre correcto.
 *
 * LO QUE ESTE SERVICE WORKER NO HACE
 * No sincroniza datos ni recibe notificaciones push. Hoy los datos viven en
 * localStorage del dispositivo, así que no hay nada que sincronizar. Las
 * notificaciones push necesitan además un servidor que las dispare. Ambas
 * cosas llegan cuando exista Supabase. Ver docs/adr/0002.
 */

/**
 * Versión de la caché. Al cambiarla, el service worker nuevo descarta todo lo
 * guardado por el anterior. Se sube al cambiar el envoltorio de la aplicación.
 */
const VERSION = 'v1';
const CACHE = `april-collections-${VERSION}`;

/**
 * Lo mínimo para que la aplicación arranque sin conexión.
 *
 * Los archivos con huella en el nombre (los de /assets/) no se listan aquí:
 * cambian en cada compilación y se van guardando solos según se piden.
 */
const ENVOLTORIO = ['/', '/app', '/login', '/manifest.webmanifest', '/icono-192.png'];

// ── Instalación ───────────────────────────────────────────────────────────
// Se descarga el envoltorio. Se usa Promise.allSettled y no cache.addAll
// porque addAll falla entera si un solo archivo no responde, y eso dejaría la
// instalación a medias sin motivo suficiente.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      await Promise.allSettled(
        ENVOLTORIO.map((ruta) => cache.add(new Request(ruta, { cache: 'reload' }))),
      );

      // Entra en servicio sin esperar a que se cierren las pestañas abiertas.
      await self.skipWaiting();
    })(),
  );
});

// ── Activación ────────────────────────────────────────────────────────────
// Se borran las cachés de versiones anteriores y se toma el control de las
// páginas que ya estuvieran abiertas.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();

      await Promise.all(
        nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)),
      );

      await self.clients.claim();
    })(),
  );
});

/**
 * Guarda una respuesta en la caché si merece la pena.
 *
 * Solo se guardan respuestas correctas y del propio sitio. Las opacas
 * (peticiones a otros dominios sin CORS) no se guardan: no se puede saber si
 * fueron bien y llenarían la caché de errores disfrazados.
 *
 * @param {Request} peticion
 * @param {Response} respuesta
 */
async function guardar(peticion, respuesta) {
  if (!respuesta || !respuesta.ok || respuesta.type === 'opaque') {
    return;
  }

  const cache = await caches.open(CACHE);
  await cache.put(peticion, respuesta.clone());
}

/**
 * Navegación: se intenta la red y, si no hay, se sirve lo guardado.
 *
 * @param {FetchEvent} evento
 * @returns {Promise<Response>}
 */
async function responderNavegacion(evento) {
  try {
    const desdeLaRed = await fetch(evento.request);
    await guardar(evento.request, desdeLaRed);
    return desdeLaRed;
  } catch {
    // Sin conexión: se devuelve la página guardada, y si esa ruta concreta no
    // está, la portada, que siempre se guarda al instalar.
    const guardada = await caches.match(evento.request);
    return guardada ?? (await caches.match('/')) ?? Response.error();
  }
}

/**
 * Recursos: se sirve lo guardado al instante y se refresca por detrás, para
 * que la próxima visita ya tenga la versión nueva.
 *
 * @param {FetchEvent} evento
 * @returns {Promise<Response>}
 */
async function responderRecurso(evento) {
  const guardada = await caches.match(evento.request);

  const desdeLaRed = fetch(evento.request)
    .then((respuesta) => {
      guardar(evento.request, respuesta);
      return respuesta;
    })
    .catch(() => null);

  if (guardada) {
    // No se espera a la red: la actualización ocurre en segundo plano.
    evento.waitUntil(desdeLaRed);
    return guardada;
  }

  return (await desdeLaRed) ?? Response.error();
}

// ── Intercepción de peticiones ────────────────────────────────────────────
self.addEventListener('fetch', (evento) => {
  const { request } = evento;

  // Solo lecturas. Un POST no se puede repetir desde la caché sin arriesgarse
  // a duplicar la operación.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Solo el propio sitio. Las peticiones a Supabase o a Google deben fallar de
  // verdad cuando no hay red, para que la aplicación pueda avisar; servir una
  // respuesta vieja de autenticación sería peor que no servir nada.
  if (url.origin !== self.location.origin) {
    return;
  }

  evento.respondWith(
    request.mode === 'navigate' ? responderNavegacion(evento) : responderRecurso(evento),
  );
});
