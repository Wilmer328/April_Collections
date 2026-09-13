/**
 * Caché local de los datos del negocio.
 *
 * QUE RESUELVE
 * Sin esto, abrir la aplicación sin conexión mostraba las seis pantallas
 * vacías: el envoltorio estaba en la caché del service worker, pero los datos
 * venían de Supabase y no llegaban. La dueña administra su negocio desde el
 * teléfono, muchas veces en casa de una clienta donde la señal falla, así que
 * una aplicación que abre pero no enseña nada no le sirve.
 *
 * COMO FUNCIONA
 * Al arrancar se pinta lo guardado de inmediato y se pide lo nuevo por detrás.
 * Si la red responde, se refresca; si no, se sigue viendo lo último conocido
 * con un aviso de que no hay conexión. Es la misma idea que el
 * stale-while-revalidate del service worker, aplicada a los datos.
 *
 * POR QUE NO SE CACHEAN LAS RESPUESTAS EN EL SERVICE WORKER
 * Sería más simple, pero el service worker no distingue de quién es cada
 * respuesta. Aquí la caché va atada al identificador del usuario, de modo que
 * los datos de una cuenta no pueden mostrarse en otra. Las políticas RLS que
 * separan a cada usuaria se evalúan en el servidor, y esa separación tiene que
 * respetarse también en el dispositivo.
 *
 * LO QUE NO HACE
 * No encola escrituras. Sin conexión se puede consultar, no guardar. Una cola
 * sin resolución de conflictos haría que dos dispositivos editando el mismo
 * stock produjeran datos incoherentes, y prefiero no tenerlo a tenerlo mal.
 */

/**
 * Versión de la forma de los datos.
 *
 * Al subirla, las cachés escritas por versiones anteriores dejan de leerse:
 * sus claves ya no coinciden. Se sube cuando cambia la estructura de lo que se
 * guarda, para que una copia vieja no se interprete con el formato nuevo.
 */
const VERSION = 'v1';

const PREFIJO = 'ac_cache_';

/** Conjuntos que se guardan. Debe coincidir con lo que carga la aplicación. */
const CONJUNTOS = ['clientes', 'productos', 'ventas', 'recordatorios', 'categorias'];

/**
 * Clave de almacenamiento.
 *
 * El identificador que recibe combina usuario y negocio: es lo que impide que
 * la caché de una cuenta se lea desde otra en un dispositivo compartido, y que
 * los datos de dos negocios del mismo usuario se mezclen entre sí.
 *
 * @param {string} idUsuario
 * @returns {string}
 */
function claveDe(idUsuario) {
  return `${PREFIJO}${VERSION}_${idUsuario}`;
}

/**
 * Datos guardados de una cuenta.
 *
 * @param {string} idUsuario
 * @returns {{ datos: object, guardadoEn: string } | null} null si no hay nada
 *   utilizable, incluido el caso de una copia corrupta.
 */
export function leer(idUsuario) {
  if (!idUsuario) {
    return null;
  }

  try {
    const crudo = localStorage.getItem(claveDe(idUsuario));

    if (!crudo) {
      return null;
    }

    const guardado = JSON.parse(crudo);

    // Se comprueba la forma antes de devolverla: una copia a medias —por una
    // pestaña cerrada a mitad de escritura, por ejemplo— rompería la interfaz
    // en el primer render, que es peor que no tener caché.
    const completa = CONJUNTOS.every((nombre) => Array.isArray(guardado?.datos?.[nombre]));

    return completa ? guardado : null;
  } catch (error) {
    console.warn('No se pudo leer la caché local:', error);
    return null;
  }
}

/**
 * Guarda los datos de una cuenta.
 *
 * @param {string} idUsuario
 * @param {object} datos
 * @returns {boolean} true si se guardó.
 */
export function guardar(idUsuario, datos) {
  if (!idUsuario) {
    return false;
  }

  try {
    localStorage.setItem(
      claveDe(idUsuario),
      JSON.stringify({ guardadoEn: new Date().toISOString(), datos }),
    );

    return true;
  } catch (error) {
    // Se queda sin espacio, o el navegador bloquea el almacenamiento en modo
    // privado. Se pierde la comodidad de abrir sin conexión, nada más: la
    // aplicación sigue funcionando contra la red.
    console.warn('No se pudo guardar la caché local:', error);
    return false;
  }
}

/**
 * Borra la caché de todas las cuentas.
 *
 * Se llama al cerrar sesión. En un teléfono compartido, dejar ahí el negocio
 * de quien acaba de salir sería exactamente lo que las políticas RLS impiden
 * del lado del servidor.
 *
 * @returns {void}
 */
export function limpiar() {
  try {
    // Se recorre con length/key(), que es la API documentada de Storage.
    // Object.keys(localStorage) tambien funciona en los navegadores, pero
    // depende de que expongan las claves como propiedades enumerables, que es
    // una peculiaridad y no parte del contrato.
    const claves = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const clave = localStorage.key(i);
      if (clave?.startsWith(PREFIJO)) {
        claves.push(clave);
      }
    }

    // Se borran despues de recorrer: eliminar sobre la marcha desplaza los
    // indices y dejaria claves sin visitar.
    claves.forEach((clave) => localStorage.removeItem(clave));
  } catch (error) {
    console.warn('No se pudo limpiar la caché local:', error);
  }
}

/**
 * Describe en palabras cuándo se guardó, para poder avisar de que lo que se
 * está viendo no es lo más reciente.
 *
 * @param {string} guardadoEn fecha ISO.
 * @param {Date} [ahora]
 * @returns {string}
 */
export function describirAntiguedad(guardadoEn, ahora = new Date()) {
  const minutos = Math.round((ahora.getTime() - new Date(guardadoEn).getTime()) / 60000);

  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} minuto${minutos === 1 ? '' : 's'}`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} hora${horas === 1 ? '' : 's'}`;

  const dias = Math.round(horas / 24);
  return `hace ${dias} día${dias === 1 ? '' : 's'}`;
}
