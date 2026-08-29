/**
 * Animaciones de la landing page.
 *
 * Dos comportamientos, ambos resueltos con IntersectionObserver en vez de
 * escuchar el evento `scroll`: el navegador avisa solo cuando un elemento
 * cruza el umbral, sin ejecutar código en cada pixel desplazado.
 *
 *   1. Aparición progresiva de secciones y tarjetas al entrar en pantalla.
 *   2. Sombra en la cabecera cuando la página deja de estar arriba del todo.
 *
 * El CSS que oculta los elementos cuelga de `.anim`, que añade
 * enable-motion.js. Si este módulo no se ejecuta pero `.anim` sí está puesta,
 * los elementos quedarían ocultos, así que el arranque se envuelve en
 * try/catch y ante cualquier fallo se revela todo de golpe.
 */

const REVEAL_SELECTOR = '.reveal';
const VISIBLE_CLASS = 'is-visible';
const STUCK_CLASS = 'is-stuck';
const SENTINEL_ID = 'scroll-sentinel';
const HEADER_SELECTOR = '.site-header';

/** Proporción del elemento que debe verse para considerarlo "en pantalla". */
const REVEAL_THRESHOLD = 0.15;

/** Recorta el borde inferior del área de observación para que la animación
 *  arranque cuando el elemento ya subió un poco, no al asomar el primer pixel. */
const REVEAL_ROOT_MARGIN = '0px 0px -10% 0px';

const soportaObserver = typeof IntersectionObserver !== 'undefined';

/**
 * Muestra los elementos sin animarlos. Es el camino de respaldo.
 *
 * @param {Iterable<Element>} elementos
 */
function revelarTodo(elementos) {
  for (const elemento of elementos) {
    elemento.classList.add(VISIBLE_CLASS);
  }
}

/**
 * Revela cada elemento marcado con `.reveal` cuando entra en pantalla.
 * Deja de observarlo después: la animación ocurre una sola vez.
 */
function iniciarAparicion() {
  const elementos = document.querySelectorAll(REVEAL_SELECTOR);

  if (elementos.length === 0) {
    return;
  }

  if (!soportaObserver) {
    revelarTodo(elementos);
    return;
  }

  const observador = new IntersectionObserver(
    (entradas, instancia) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) {
          continue;
        }

        entrada.target.classList.add(VISIBLE_CLASS);
        instancia.unobserve(entrada.target);
      }
    },
    { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN },
  );

  for (const elemento of elementos) {
    observador.observe(elemento);
  }
}

/**
 * Añade sombra a la cabecera fija cuando el centinela del tope de la página
 * sale de pantalla, es decir, cuando el usuario empezó a desplazarse.
 */
function iniciarSombraCabecera() {
  const cabecera = document.querySelector(HEADER_SELECTOR);
  const centinela = document.getElementById(SENTINEL_ID);

  if (!cabecera || !centinela || !soportaObserver) {
    return;
  }

  const observador = new IntersectionObserver(([entrada]) => {
    cabecera.classList.toggle(STUCK_CLASS, !entrada.isIntersecting);
  });

  observador.observe(centinela);
}

try {
  iniciarAparicion();
  iniciarSombraCabecera();

  // Este módulo arrancó: ya no hace falta la red de seguridad que dejó
  // programada enable-motion.js para revelar el contenido sin animación.
  window.clearTimeout(window.acRevealFailsafeId);
} catch (error) {
  // Ante cualquier fallo inesperado, la prioridad es que el contenido se lea.
  revelarTodo(document.querySelectorAll(REVEAL_SELECTOR));
  console.error('No se pudieron iniciar las animaciones de la landing:', error);
}
