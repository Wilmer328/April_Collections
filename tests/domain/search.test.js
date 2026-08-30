import { describe, it, expect } from 'vitest';

import { normalizar, coincide, filtrarPor } from '../../src/domain/search.js';

describe('search — normalización', () => {
  it('quita mayúsculas y espacios sobrantes', () => {
    expect(normalizar('  María  ')).toBe('maria');
  });

  it('quita las tildes, para poder teclear sin ellas en el teléfono', () => {
    expect(normalizar('Joyería')).toBe('joyeria');
    expect(normalizar('Perfumés')).toBe('perfumes');
  });

  it('devuelve cadena vacía si no recibe texto', () => {
    expect(normalizar(undefined)).toBe('');
    expect(normalizar(null)).toBe('');
  });
});

describe('search — coincidencia', () => {
  it('encuentra por fragmento', () => {
    expect(coincide('María Fernanda López', 'fernanda')).toBe(true);
  });

  it('encuentra escribiendo sin tildes', () => {
    expect(coincide('María', 'maria')).toBe(true);
  });

  it('no encuentra lo que no está', () => {
    expect(coincide('María', 'juana')).toBe(false);
  });

  // El buscador vacío no debe ocultar la lista.
  it('una consulta vacía coincide con todo', () => {
    expect(coincide('cualquier cosa', '')).toBe(true);
    expect(coincide('cualquier cosa', '   ')).toBe(true);
  });
});

describe('search — filtrado', () => {
  const clientes = [
    { nombre: 'María López', tel: '9999-1111' },
    { nombre: 'Juana Pérez', tel: '9999-2222' },
    { nombre: 'María Fernanda', tel: '8888-3333' },
  ];

  it('devuelve todas las coincidencias', () => {
    expect(filtrarPor(clientes, 'maria', ['nombre'])).toHaveLength(2);
  });

  it('busca en varios campos a la vez', () => {
    const porTelefono = filtrarPor(clientes, '8888', ['nombre', 'tel']);

    expect(porTelefono).toHaveLength(1);
    expect(porTelefono[0].nombre).toBe('María Fernanda');
  });

  it('devuelve la lista completa si no hay consulta', () => {
    expect(filtrarPor(clientes, '', ['nombre'])).toHaveLength(3);
  });

  it('devuelve lista vacía si nada coincide', () => {
    expect(filtrarPor(clientes, 'zzz', ['nombre'])).toEqual([]);
  });

  it('no modifica la lista original', () => {
    const copia = filtrarPor(clientes, '', ['nombre']);
    copia.pop();

    expect(clientes).toHaveLength(3);
  });

  it('rechaza lo que no es una lista', () => {
    expect(() => filtrarPor('no es lista', 'a', ['nombre'])).toThrow(TypeError);
  });
});
