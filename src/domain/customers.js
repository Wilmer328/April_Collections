/**
 * Clientas: identidad y detección de duplicados.
 *
 * El problema que resuelve: dos personas distintas pueden llamarse igual, y al
 * registrar una venta hay que saber a cuál se le está cargando la deuda.
 *
 * El DNI es OPCIONAL a propósito. La usuaria registra clientas desde el
 * teléfono, muchas veces en medio de una venta y sin el documento a la vista.
 * Exigirlo la obligaría a interrumpir la venta o a inventar un número. Cuando
 * sí lo escribe, se valida y se exige que sea único; cuando no, el sistema
 * avisa de los nombres repetidos para que ella decida.
 */

import { normalizar } from './search.js';

/** El DNI hondureño tiene 13 dígitos. */
export const LONGITUD_DNI = 13;

/**
 * Deja el DNI en dígitos, sin guiones ni espacios, que es como se guarda.
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizarDni(texto) {
  if (typeof texto !== 'string') {
    return '';
  }

  return texto.replace(/\D/g, '');
}

/**
 * Indica si un DNI tiene la forma esperada.
 *
 * Solo comprueba longitud y que sean dígitos. No se valida el dígito
 * verificador ni el código de municipio: no se documentó esa regla para este
 * proyecto y una validación inventada rechazaría documentos legítimos.
 *
 * @param {string} texto
 * @returns {boolean}
 */
export function esDniValido(texto) {
  return normalizarDni(texto).length === LONGITUD_DNI;
}

/**
 * Presenta el DNI en el formato con el que se lee en Honduras: 0801-1999-12345.
 *
 * @param {string} texto
 * @returns {string} el DNI agrupado, o el texto original si no es válido.
 */
export function formatearDni(texto) {
  const digitos = normalizarDni(texto);

  if (digitos.length !== LONGITUD_DNI) {
    return texto ?? '';
  }

  return `${digitos.slice(0, 4)}-${digitos.slice(4, 8)}-${digitos.slice(8)}`;
}

/**
 * Busca una clienta ya registrada con el mismo DNI.
 *
 * @param {object[]} clientes
 * @param {string} dni
 * @param {string} [idExcluido] id a ignorar, para no chocar consigo misma al editar.
 * @returns {object | undefined} la clienta que ya tiene ese DNI, si existe.
 */
export function buscarPorDni(clientes, dni, idExcluido) {
  const buscado = normalizarDni(dni);

  if (buscado === '') {
    return undefined;
  }

  return clientes.find(
    (cliente) => cliente.id !== idExcluido && normalizarDni(cliente.dni) === buscado,
  );
}

/**
 * Busca clientas registradas con el mismo nombre.
 *
 * No es un error: es información para que la usuaria distinga entre dos
 * personas reales que se llaman igual.
 *
 * @param {object[]} clientes
 * @param {string} nombre
 * @param {string} [idExcluido]
 * @returns {object[]} las clientas que ya usan ese nombre.
 */
export function buscarPorNombre(clientes, nombre, idExcluido) {
  const buscado = normalizar(nombre);

  if (buscado === '') {
    return [];
  }

  return clientes.filter(
    (cliente) => cliente.id !== idExcluido && normalizar(cliente.nombre) === buscado,
  );
}

/**
 * Comprueba si se puede registrar una clienta con estos datos.
 *
 * @param {{ nombre: string, dni?: string }} datos
 * @param {object[]} clientes las ya registradas.
 * @param {string} [idExcluido]
 * @returns {{ valido: boolean, error: string|null, aviso: string|null }}
 *   `error` impide guardar; `aviso` deja guardar pero informa.
 */
export function validarCliente({ nombre, dni = '' }, clientes = [], idExcluido) {
  const nombreLimpio = (nombre ?? '').trim();

  if (nombreLimpio === '') {
    return { valido: false, error: 'Escribe el nombre de la clienta.', aviso: null };
  }

  const dniLimpio = normalizarDni(dni);

  if (dniLimpio !== '' && !esDniValido(dniLimpio)) {
    return {
      valido: false,
      error: `El DNI debe tener ${LONGITUD_DNI} dígitos. Se escribieron ${dniLimpio.length}.`,
      aviso: null,
    };
  }

  const repetida = buscarPorDni(clientes, dniLimpio, idExcluido);

  if (repetida) {
    return {
      valido: false,
      error: `Ese DNI ya está registrado para ${repetida.nombre}.`,
      aviso: null,
    };
  }

  const mismoNombre = buscarPorNombre(clientes, nombreLimpio, idExcluido);

  if (mismoNombre.length > 0) {
    return {
      valido: true,
      error: null,
      aviso:
        dniLimpio === ''
          ? `Ya existe otra clienta llamada ${nombreLimpio}. Agrega el DNI para distinguirlas.`
          : `Ya existe otra clienta llamada ${nombreLimpio}, pero con distinto DNI.`,
    };
  }

  return { valido: true, error: null, aviso: null };
}
