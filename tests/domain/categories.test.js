import { describe, it, expect } from 'vitest';

import {
  CATEGORIAS_INICIALES,
  MAX_LARGO_CATEGORIA,
  sonLaMisma,
  validarCategoria,
  agregarCategoria,
  contarProductos,
  puedeEliminarse,
  eliminarCategoria,
  categoriasDesdeProductos,
} from '../../src/domain/categories.js';

const existentes = ['Joyería', 'Maquillaje', 'Otro'];

describe('categories — identidad', () => {
  it('ignora mayúsculas y tildes al comparar', () => {
    expect(sonLaMisma('Joyería', 'joyeria')).toBe(true);
    expect(sonLaMisma('JOYERIA', 'Joyería')).toBe(true);
  });

  it('distingue categorías realmente distintas', () => {
    expect(sonLaMisma('Joyería', 'Maquillaje')).toBe(false);
  });
});

describe('categories — validación', () => {
  it('acepta un nombre nuevo', () => {
    const r = validarCategoria('Bolsos', existentes);

    expect(r.valido).toBe(true);
    expect(r.nombre).toBe('Bolsos');
  });

  it('recorta los espacios sobrantes', () => {
    expect(validarCategoria('  Ropa   interior  ', existentes).nombre).toBe('Ropa interior');
  });

  it('exige un nombre', () => {
    expect(validarCategoria('   ', existentes).valido).toBe(false);
  });

  // Sin esto la usuaria podría acabar con "Joyeria" y "Joyería" como rubros
  // separados y los productos quedarían repartidos entre ambos.
  it('rechaza una que ya existe aunque se escriba distinto', () => {
    const r = validarCategoria('joyeria', existentes);

    expect(r.valido).toBe(false);
    expect(r.error).toContain('Joyería');
  });

  it('rechaza nombres demasiado largos', () => {
    const largo = 'a'.repeat(MAX_LARGO_CATEGORIA + 1);

    expect(validarCategoria(largo, existentes).valido).toBe(false);
  });

  it('acepta justo el largo máximo', () => {
    expect(validarCategoria('a'.repeat(MAX_LARGO_CATEGORIA), existentes).valido).toBe(true);
  });
});

describe('categories — agregar', () => {
  it('devuelve una lista nueva con la categoría al final', () => {
    expect(agregarCategoria(existentes, 'Bolsos')).toEqual([...existentes, 'Bolsos']);
  });

  it('no modifica la lista original', () => {
    agregarCategoria(existentes, 'Bolsos');

    expect(existentes).toHaveLength(3);
  });

  it('falla si el nombre no es válido', () => {
    expect(() => agregarCategoria(existentes, 'Joyería')).toThrow(/ya existe/);
    expect(() => agregarCategoria(existentes, '')).toThrow();
  });
});

describe('categories — eliminar', () => {
  const productos = [
    { nombre: 'Aretes', categoria: 'Joyería' },
    { nombre: 'Labial', categoria: 'Maquillaje' },
  ];

  it('cuenta los productos de una categoría', () => {
    expect(contarProductos(productos, 'Joyería')).toBe(1);
    expect(contarProductos(productos, 'Otro')).toBe(0);
  });

  // Borrar una categoría en uso dejaría productos apuntando a un rubro
  // inexistente y el filtro del catálogo dejaría de encontrarlos.
  it('no deja eliminar una categoría con productos', () => {
    const r = puedeEliminarse('Joyería', productos);

    expect(r.puede).toBe(false);
    expect(r.motivo).toContain('1 producto');
  });

  it('deja eliminar una categoría vacía', () => {
    expect(puedeEliminarse('Otro', productos).puede).toBe(true);
  });

  it('la quita de la lista sin tocar las demás', () => {
    expect(eliminarCategoria(existentes, 'Maquillaje')).toEqual(['Joyería', 'Otro']);
    expect(existentes).toHaveLength(3);
  });
});

describe('categories — catálogos que ya existían', () => {
  it('parte de las categorías iniciales', () => {
    expect(categoriasDesdeProductos([])).toEqual([...CATEGORIAS_INICIALES]);
  });

  // Si un producto guardado usa un rubro que no está en la lista, quedaría
  // fuera de todos los filtros del catálogo.
  it('recupera las categorías que los productos ya usaban', () => {
    const productos = [{ categoria: 'Bisutería' }, { categoria: 'Joyería' }];

    const lista = categoriasDesdeProductos(productos);

    expect(lista).toContain('Bisutería');
    expect(lista.filter((c) => c === 'Joyería')).toHaveLength(1);
  });

  it('ignora productos sin categoría', () => {
    expect(categoriasDesdeProductos([{ categoria: '' }, {}])).toEqual([...CATEGORIAS_INICIALES]);
  });
});
