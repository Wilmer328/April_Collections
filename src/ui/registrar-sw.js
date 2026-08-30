/**
 * Registra el service worker y ofrece instalar la aplicación.
 *
 * Se mantiene aparte de la lógica de las pantallas: si el navegador no admite
 * service workers, o el registro falla, la aplicación debe seguir funcionando
 * exactamente igual. Por eso todo aquí va envuelto en try/catch y nada de lo
 * que ocurra en este archivo puede impedir que la página se use.
 */

const RUTA_SW = '/sw.js';

/** Evento que el navegador guarda para ofrecer la instalación más tarde. */
let promptDeInstalacion = null;

/**
 * Registra el service worker.
 *
 * @returns {Promise<void>}
 */
export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register(RUTA_SW);
  } catch (error) {
    // Sin service worker se pierde el modo sin conexión, no la aplicación.
    console.warn('No se pudo registrar el service worker:', error);
  }
}

/**
 * Conecta el botón de instalación.
 *
 * El navegador decide cuándo la aplicación es instalable y avisa con el evento
 * `beforeinstallprompt`. Hasta entonces el botón permanece oculto: mostrarlo
 * antes daría un botón que no hace nada.
 *
 * @param {HTMLElement} boton
 */
export function conectarBotonInstalar(boton) {
  if (!boton) {
    return;
  }

  window.addEventListener('beforeinstallprompt', (evento) => {
    // Se cancela el aviso automático del navegador para mostrarlo cuando la
    // usuaria pulse el botón, en su propio contexto.
    evento.preventDefault();
    promptDeInstalacion = evento;
    boton.hidden = false;
  });

  boton.addEventListener('click', async () => {
    if (!promptDeInstalacion) {
      return;
    }

    try {
      await promptDeInstalacion.prompt();
      await promptDeInstalacion.userChoice;
    } catch (error) {
      console.warn('No se pudo mostrar el diálogo de instalación:', error);
    } finally {
      // El evento solo sirve una vez.
      promptDeInstalacion = null;
      boton.hidden = true;
    }
  });

  // Ya instalada: el botón deja de tener sentido.
  window.addEventListener('appinstalled', () => {
    promptDeInstalacion = null;
    boton.hidden = true;
  });
}

/**
 * Indica si la aplicación se está ejecutando instalada y no en una pestaña.
 *
 * @returns {boolean}
 */
export function estaInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no admite display-mode y usa esta propiedad propia.
    window.navigator.standalone === true
  );
}
