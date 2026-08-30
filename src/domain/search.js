/**
 * Búsqueda de texto sobre listas.
 *
 * La usuaria escribe desde el teléfono y con prisa: teclea "maria" y espera
 * encontrar a "María", y "joyeria" debe encontrar "Joyería". Por eso la
 * comparación ignora mayúsculas, tildes y espacios sobrantes.
 */

/**
 * Deja un texto en su forma comparable: sin mayúsculas, sin tildes y sin
 * espacios de más.
 *
 * La descomposición NFD separa cada letra de su tilde, y el rango ̀-ͯ
 * elimina esas marcas: "María" queda "maria".
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  if (typeof texto !== 'string') {
    return '';
  }

  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Indica si un texto contiene la consulta.
 *
 * Una consulta vacía coincide con todo: el buscador sin escribir nada no debe
 * ocultar la lista.
 *
 * @param {string} texto
 * @param {string} consulta
 * @returns {boolean}
 */
export function coincide(texto, consulta) {
  const aguja = normalizar(consulta);

  if (aguja === '') {
    return true;
  }

  return normalizar(texto).includes(aguja);
}

/**
 * Filtra una lista buscando la consulta en varios campos de cada elemento.
 *
 * @param {object[]} elementos
 * @param {string} consulta
 * @param {string[]} campos nombres de las propiedades donde buscar.
 * @returns {object[]} los elementos que coinciden en al menos un campo.
 */
export function filtrarPor(elementos, consulta, campos) {
  if (!Array.isArray(elementos)) {
    throw new TypeError('Se esperaba una lista de elementos.');
  }

  if (normalizar(consulta) === '') {
    return [...elementos];
  }

  return elementos.filter((elemento) =>
    campos.some((campo) => coincide(elemento[campo], consulta)),
  );
}
