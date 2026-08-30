/**
 * Categorías del catálogo.
 *
 * Antes eran una lista fija en el código. El negocio cambia de rubros con el
 * tiempo —hoy vende sandalias, mañana ropa— y esperar a que alguien edite el
 * código para vender algo nuevo no es aceptable. Ahora la usuaria las
 * administra ella misma y se guardan con sus datos.
 */

import { normalizar } from './search.js';

/** Categorías con las que arranca un catálogo nuevo. */
export const CATEGORIAS_INICIALES = Object.freeze([
  'Joyería',
  'Maquillaje',
  'Sandalias',
  'Perfumes',
  'Otro',
]);

/** Longitud máxima, para que quepa en los botones de filtro. */
export const MAX_LARGO_CATEGORIA = 24;

/**
 * Indica si dos nombres de categoría se refieren a lo mismo.
 * "joyeria" y "Joyería" son la misma categoría escrita de dos formas.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sonLaMisma(a, b) {
  return normalizar(a) === normalizar(b);
}

/**
 * Comprueba si se puede agregar una categoría con ese nombre.
 *
 * @param {string} nombre
 * @param {string[]} existentes
 * @returns {{ valido: boolean, error: string|null, nombre: string }}
 *   `nombre` viene ya recortado, listo para guardar.
 */
export function validarCategoria(nombre, existentes = []) {
  const limpio = (nombre ?? '').trim().replace(/\s+/g, ' ');

  if (limpio === '') {
    return { valido: false, error: 'Escribe el nombre de la categoría.', nombre: limpio };
  }

  if (limpio.length > MAX_LARGO_CATEGORIA) {
    return {
      valido: false,
      error: `El nombre no puede pasar de ${MAX_LARGO_CATEGORIA} caracteres.`,
      nombre: limpio,
    };
  }

  const repetida = existentes.find((existente) => sonLaMisma(existente, limpio));

  if (repetida) {
    return { valido: false, error: `La categoría "${repetida}" ya existe.`, nombre: limpio };
  }

  return { valido: true, error: null, nombre: limpio };
}

/**
 * Agrega una categoría a la lista.
 *
 * @param {string[]} existentes
 * @param {string} nombre
 * @returns {string[]} lista nueva; la recibida no se modifica.
 * @throws {Error} si el nombre no es válido.
 */
export function agregarCategoria(existentes, nombre) {
  const resultado = validarCategoria(nombre, existentes);

  if (!resultado.valido) {
    throw new Error(resultado.error);
  }

  return [...existentes, resultado.nombre];
}

/**
 * Cuenta los productos que usan una categoría.
 *
 * @param {object[]} productos
 * @param {string} categoria
 * @returns {number}
 */
export function contarProductos(productos, categoria) {
  return productos.filter((producto) => sonLaMisma(producto.categoria, categoria)).length;
}

/**
 * Indica si una categoría se puede eliminar.
 *
 * Solo se permite si está vacía: borrar una categoría en uso dejaría productos
 * apuntando a un rubro inexistente, y el filtro del catálogo dejaría de
 * encontrarlos.
 *
 * @param {string} categoria
 * @param {object[]} productos
 * @returns {{ puede: boolean, motivo: string|null }}
 */
export function puedeEliminarse(categoria, productos = []) {
  const enUso = contarProductos(productos, categoria);

  if (enUso > 0) {
    return {
      puede: false,
      motivo: `"${categoria}" tiene ${enUso} producto(s). Muévelos o elimínalos primero.`,
    };
  }

  return { puede: true, motivo: null };
}

/**
 * Quita una categoría de la lista.
 *
 * @param {string[]} existentes
 * @param {string} categoria
 * @returns {string[]} lista nueva; la recibida no se modifica.
 */
export function eliminarCategoria(existentes, categoria) {
  return existentes.filter((existente) => !sonLaMisma(existente, categoria));
}

/**
 * Reconstruye la lista de categorías de un catálogo ya existente.
 *
 * Se usa una sola vez, al abrir por primera vez una versión con categorías
 * administrables: combina las iniciales con las que los productos ya guardados
 * estén usando, para que ninguno quede fuera del filtro.
 *
 * @param {object[]} productos
 * @returns {string[]}
 */
export function categoriasDesdeProductos(productos = []) {
  const lista = [...CATEGORIAS_INICIALES];

  productos.forEach((producto) => {
    const usada = (producto.categoria ?? '').trim();
    const yaEsta = usada === '' || lista.some((existente) => sonLaMisma(existente, usada));

    if (!yaEsta) {
      lista.push(usada);
    }
  });

  return lista;
}
