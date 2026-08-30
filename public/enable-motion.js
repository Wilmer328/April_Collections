/**
 * Activa las animaciones marcando <html class="anim">.
 *
 * Por qué existe este archivo y por qué se carga en el <head> de forma
 * bloqueante:
 *
 * 1. TODO el CSS de animación cuelga de `.anim`. Si este script no llega a
 *    ejecutarse (falla la red, el usuario bloquea JavaScript), la clase nunca
 *    se añade y la página se ve estática y completa. El modo de fallo es
 *    "sin animación", nunca "contenido invisible", que es el error clásico de
 *    las animaciones al hacer scroll.
 *
 * 2. Al ser bloqueante y estar en el <head>, corre antes del primer pintado.
 *    Así no se ve el destello del contenido apareciendo y ocultándose.
 *
 * 3. Es un archivo externo, no un <script> inline, para que la CSP estricta de
 *    la Etapa 7 pueda prohibir scripts inline sin excepciones.
 *
 * Es un script clásico (no módulo) a propósito: los módulos son diferidos y se
 * ejecutarían después del primer pintado.
 */

(function enableMotion() {
  'use strict';

  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  var MOTION_CLASS = 'anim';
  var FAILSAFE_CLASS = 'anim-failed';

  /** Margen que se le da a landing-animations.js para arrancar. */
  var FAILSAFE_MS = 2000;

  // El usuario pidió menos movimiento en su sistema operativo: se respeta y
  // no se activa ninguna animación.
  if (window.matchMedia && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return;
  }

  document.documentElement.classList.add(MOTION_CLASS);

  // Red de seguridad para el único caso en que el contenido podría quedar
  // oculto: que este archivo cargue (poniendo .anim, que aplica opacity:0 a
  // los elementos .reveal) pero landing-animations.js no llegue a ejecutarse
  // y por tanto nadie los revele.
  //
  // Si eso pasa, a los 2 segundos se marca .anim-failed y el CSS muestra todo
  // sin animación. landing-animations.js cancela este temporizador en cuanto
  // arranca bien, así que en el camino normal nunca se dispara.
  window.acRevealFailsafeId = window.setTimeout(function () {
    document.documentElement.classList.add(FAILSAFE_CLASS);
  }, FAILSAFE_MS);
})();
