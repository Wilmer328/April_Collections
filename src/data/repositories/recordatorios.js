/**
 * Repositorio de recordatorios de cobro.
 *
 * Guarda además el estado del aviso —cuándo se lanzó y si la usuaria ya lo
 * atendió—, para que un recordatorio siga insistiendo aunque se cambie de
 * dispositivo o se recargue la página.
 */

import { tabla, desenvolver, idDelDuenio } from './_comun.js';

const TABLA = 'recordatorios';

/**
 * @typedef {{ id: string, clienteId: string, ventaId: string|null, fecha: string,
 *             hora: string, nota: string, estado: string,
 *             avisadoEn: string|null, visto: boolean }} Recordatorio
 */

/**
 * @param {object} fila
 * @returns {Recordatorio}
 */
function desdeBase(fila) {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    ventaId: fila.venta_id,
    fecha: fila.fecha,
    // La base devuelve la hora como HH:MM:SS; la interfaz trabaja con HH:MM.
    hora: (fila.hora ?? '09:00').slice(0, 5),
    nota: fila.nota ?? '',
    estado: fila.estado,
    avisadoEn: fila.avisado_en,
    visto: fila.visto,
  };
}

/**
 * Lista los recordatorios, del más próximo al más lejano.
 *
 * @returns {Promise<Recordatorio[]>}
 */
export async function listar() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase.from(TABLA).select('*').order('fecha').order('hora'),
    'cargar los recordatorios',
  );

  return filas.map(desdeBase);
}

/**
 * Agenda un cobro.
 *
 * @param {{ clienteId: string, ventaId?: string|null, fecha: string, hora?: string, nota?: string }} datos
 * @returns {Promise<Recordatorio>}
 */
export async function crear({ clienteId, ventaId = null, fecha, hora = '09:00', nota = '' }) {
  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  const fila = desenvolver(
    await supabase
      .from(TABLA)
      .insert({
        owner_id,
        cliente_id: clienteId,
        venta_id: ventaId || null,
        fecha,
        hora,
        nota: nota.trim() === '' ? null : nota.trim(),
      })
      .select()
      .single(),
    'guardar el recordatorio',
  );

  return desdeBase(fila);
}

/**
 * Actualiza un recordatorio.
 *
 * @param {string} id
 * @param {{ fecha?: string, hora?: string, nota?: string, estado?: string,
 *           avisadoEn?: string|null, visto?: boolean }} cambios
 * @returns {Promise<Recordatorio>}
 */
export async function actualizar(id, cambios) {
  const supabase = await tabla();

  const parche = {};
  if (cambios.fecha !== undefined) parche.fecha = cambios.fecha;
  if (cambios.hora !== undefined) parche.hora = cambios.hora;
  if (cambios.nota !== undefined) parche.nota = cambios.nota.trim() || null;
  if (cambios.estado !== undefined) parche.estado = cambios.estado;
  if (cambios.avisadoEn !== undefined) parche.avisado_en = cambios.avisadoEn;
  if (cambios.visto !== undefined) parche.visto = cambios.visto;

  const fila = desenvolver(
    await supabase.from(TABLA).update(parche).eq('id', id).select().single(),
    'actualizar el recordatorio',
  );

  return desdeBase(fila);
}

/**
 * Cierra de golpe todos los recordatorios pendientes de una venta.
 *
 * Se usa al saldarse la deuda: nadie debe seguir recibiendo avisos para cobrar
 * algo que ya está pagado.
 *
 * @param {string} ventaId
 * @returns {Promise<void>}
 */
export async function completarPorVenta(ventaId) {
  const supabase = await tabla();

  desenvolver(
    await supabase
      .from(TABLA)
      .update({ estado: 'completado' })
      .eq('venta_id', ventaId)
      .eq('estado', 'pendiente'),
    'cerrar los recordatorios de la venta',
  );
}

/**
 * Elimina un recordatorio.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function eliminar(id) {
  const supabase = await tabla();

  desenvolver(await supabase.from(TABLA).delete().eq('id', id), 'eliminar el recordatorio');
}
