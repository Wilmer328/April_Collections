import { describe, it, expect } from 'vitest';

import {
  LONGITUD_DNI,
  normalizarDni,
  esDniValido,
  formatearDni,
  buscarPorDni,
  buscarPorNombre,
  validarCliente,
} from '../../src/domain/customers.js';

const DNI_A = '0801199912345';
const DNI_B = '0501200054321';

const clientes = [
  { id: '1', nombre: 'María López', dni: DNI_A },
  { id: '2', nombre: 'Juana Pérez', dni: '' },
];

describe('customers — DNI', () => {
  it('guarda solo los dígitos, sin importar cómo se escriba', () => {
    expect(normalizarDni('0801-1999-12345')).toBe(DNI_A);
    expect(normalizarDni('0801 1999 12345')).toBe(DNI_A);
  });

  it(`acepta un DNI de ${LONGITUD_DNI} dígitos`, () => {
    expect(esDniValido(DNI_A)).toBe(true);
    expect(esDniValido('0801-1999-12345')).toBe(true);
  });

  it('rechaza los que no tienen la longitud correcta', () => {
    expect(esDniValido('12345')).toBe(false);
    expect(esDniValido('08011999123456789')).toBe(false);
    expect(esDniValido('')).toBe(false);
  });

  it('lo muestra agrupado como se lee en Honduras', () => {
    expect(formatearDni(DNI_A)).toBe('0801-1999-12345');
  });

  it('deja el texto tal cual si aún no es un DNI completo', () => {
    expect(formatearDni('080119')).toBe('080119');
  });
});

describe('customers — búsqueda de repetidos', () => {
  it('encuentra a quien ya tiene ese DNI', () => {
    expect(buscarPorDni(clientes, '0801-1999-12345')?.nombre).toBe('María López');
  });

  it('no confunde a una clienta consigo misma al editarla', () => {
    expect(buscarPorDni(clientes, DNI_A, '1')).toBeUndefined();
  });

  it('un DNI vacío no cuenta como repetido', () => {
    expect(buscarPorDni(clientes, '')).toBeUndefined();
  });

  it('encuentra nombres iguales aunque se escriban con otras tildes', () => {
    expect(buscarPorNombre(clientes, 'maria lopez')).toHaveLength(1);
  });
});

describe('customers — validación al registrar', () => {
  it('exige el nombre', () => {
    const r = validarCliente({ nombre: '   ' }, clientes);

    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/nombre/i);
  });

  // El DNI es opcional a propósito: la usuaria registra clientas en medio de
  // una venta y no siempre tiene el documento a la vista.
  it('deja registrar sin DNI', () => {
    const r = validarCliente({ nombre: 'Ana Nueva' }, clientes);

    expect(r.valido).toBe(true);
    expect(r.error).toBeNull();
    expect(r.aviso).toBeNull();
  });

  it('rechaza un DNI incompleto', () => {
    const r = validarCliente({ nombre: 'Ana', dni: '123' }, clientes);

    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/13 dígitos/);
  });

  it('rechaza un DNI ya registrado y dice de quién es', () => {
    const r = validarCliente({ nombre: 'Otra Persona', dni: DNI_A }, clientes);

    expect(r.valido).toBe(false);
    expect(r.error).toContain('María López');
  });

  // El caso que motivó esta funcionalidad: dos personas distintas, mismo nombre.
  it('avisa del nombre repetido y pide el DNI para distinguir', () => {
    const r = validarCliente({ nombre: 'María López' }, clientes);

    expect(r.valido).toBe(true);
    expect(r.aviso).toMatch(/DNI/);
  });

  it('deja registrar el mismo nombre si el DNI es distinto', () => {
    const r = validarCliente({ nombre: 'María López', dni: DNI_B }, clientes);

    expect(r.valido).toBe(true);
    expect(r.aviso).toMatch(/distinto DNI/);
  });

  it('acepta el DNI escrito con guiones', () => {
    const r = validarCliente({ nombre: 'Ana', dni: '0501-2000-54321' }, clientes);

    expect(r.valido).toBe(true);
  });
});
