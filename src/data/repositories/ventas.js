/**
 * Repositorio de ventas.
 *
 * Es el más complejo porque una venta no es una fila: son tres tablas.
 *
 *   ventas        cabecera: cliente, fecha, forma de pago
 *   venta_items   una fila por producto vendido
 *   abonos        una fila por pago recibido
 *
 * La aplicación las maneja como un solo objeto con `items` y `abonos` dentro,
 * que es como se piensan y como se muestran. El desmontaje y el rearmado
 * ocurren aquí.
 */

import { tabla, desenvolver, idDelDuenio, aBase, aApp } from './_comun.js';

const TABLA = 'ventas';

/**
 * @typedef {{ productoId: string|null, nombre: string, precio: number, costo: number, qty: number }} ItemVenta
 * @typedef {{ monto: number, fecha: string }} Abono
 * @typedef {{ id: string, clienteId: string, fecha: string, tipoPago: string, items: ItemVenta[], abonos: Abono[], total: number }} Venta
 */

/** Trae la venta con sus líneas y sus abonos en una sola consulta. */
const SELECCION = `
  id, cliente_id, fecha, tipo_pago,
  venta_items ( producto_id, nombre, precio_centavos, costo_centavos, cantidad ),
  abonos ( monto_centavos, fecha )
`;

/**
 * @param {object} fila
 * @returns {Venta}
 */
function desdeBase(fila) {
  const items = (fila.venta_items ?? []).map((item) => ({
    productoId: item.producto_id,
    nombre: item.nombre,
    precio: aApp(item.precio_centavos),
    costo: aApp(item.costo_centavos),
    qty: item.cantidad,
  }));

  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    fecha: fila.fecha,
    tipoPago: fila.tipo_pago,
    items,
    abonos: (fila.abonos ?? []).map((abono) => ({
      monto: aApp(abono.monto_centavos),
      fecha: abono.fecha,
    })),
    // El total no se guarda en la base: es la suma de las líneas. Se calcula
    // aquí para que la interfaz lo tenga listo sin recorrer los items.
    total: items.reduce((suma, item) => suma + item.precio * item.qty, 0),
  };
}

/**
 * Lista las ventas, de la más reciente a la más antigua.
 *
 * @returns {Promise<Venta[]>}
 */
export async function listar() {
  const supabase = await tabla();

  const filas = desenvolver(
    await supabase.from(TABLA).select(SELECCION).order('fecha', { ascending: false }),
    'cargar las ventas',
  );

  return filas.map(desdeBase);
}

/**
 * Registra una venta con sus líneas y su abono inicial, si lo hubo.
 *
 * Las tres inserciones no van en una transacción: la API REST de Supabase no
 * expone transacciones desde el cliente. Si fallara una intermedia se borra la
 * cabecera, y el borrado en cascada se lleva lo ya insertado. No es
 * equivalente a una transacción, pero evita dejar ventas a medias.
 *
 * @param {{ clienteId: string, fecha: string, tipoPago: string, items: ItemVenta[], abonoInicial?: number }} datos
 * @returns {Promise<Venta>}
 */
export async function crear({ clienteId, fecha, tipoPago, items, abonoInicial = 0 }) {
  const supabase = await tabla();
  const owner_id = await idDelDuenio();

  const cabecera = desenvolver(
    await supabase
      .from(TABLA)
      .insert({ owner_id, cliente_id: clienteId, fecha, tipo_pago: tipoPago })
      .select()
      .single(),
    'guardar la venta',
  );

  try {
    desenvolver(
      await supabase.from('venta_items').insert(
        items.map((item) => ({
          venta_id: cabecera.id,
          // 'custom' es la marca que usa la interfaz para un producto libre;
          // en la base eso es sencillamente la ausencia de producto.
          producto_id: item.productoId && item.productoId !== 'custom' ? item.productoId : null,
          nombre: item.nombre,
          precio_centavos: aBase(item.precio),
          costo_centavos: aBase(item.costo),
          cantidad: item.qty,
        })),
      ),
      'guardar los productos de la venta',
    );

    if (abonoInicial > 0) {
      desenvolver(
        await supabase
          .from('abonos')
          .insert({ venta_id: cabecera.id, monto_centavos: aBase(abonoInicial), fecha }),
        'guardar el abono inicial',
      );
    }
  } catch (error) {
    await supabase.from(TABLA).delete().eq('id', cabecera.id);
    throw error;
  }

  return obtener(cabecera.id);
}

/**
 * Trae una venta concreta.
 *
 * @param {string} id
 * @returns {Promise<Venta>}
 */
export async function obtener(id) {
  const supabase = await tabla();

  const fila = desenvolver(
    await supabase.from(TABLA).select(SELECCION).eq('id', id).single(),
    'cargar la venta',
  );

  return desdeBase(fila);
}

/**
 * Registra un abono sobre una venta.
 *
 * @param {string} ventaId
 * @param {number} monto en lempiras.
 * @param {string} fecha
 * @returns {Promise<void>}
 */
export async function registrarAbono(ventaId, monto, fecha) {
  const supabase = await tabla();

  desenvolver(
    await supabase
      .from('abonos')
      .insert({ venta_id: ventaId, monto_centavos: aBase(monto), fecha }),
    'registrar el abono',
  );
}

/**
 * Elimina una venta con sus líneas y abonos.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function eliminar(id) {
  const supabase = await tabla();

  desenvolver(await supabase.from(TABLA).delete().eq('id', id), 'eliminar la venta');
}
