/**
 * Un Supabase de mentira, para probar la capa de repositorios.
 *
 * Los repositorios no tienen lógica de negocio, pero sí tienen una
 * responsabilidad que se rompe en silencio: traducir entre la forma de la base
 * —snake_case, dinero en centavos— y la de la aplicación. Un error ahí no
 * lanza ninguna excepción; simplemente guarda mal.
 *
 * Esto imita lo justo del cliente de Supabase para poder mirar QUÉ se envió,
 * sin tocar la red ni una base de datos real.
 */

/** Métodos del constructor de consultas que devuelven la propia consulta. */
const ENCADENABLES = [
  'select', 'insert', 'update', 'delete',
  'eq', 'neq', 'in', 'order', 'limit', 'single', 'maybeSingle',
];

/**
 * @param {object} opciones
 * @param {Record<string, object|Function>} [opciones.respuestas] qué contesta
 *   cada tabla. Si es una función recibe la llamada registrada, que es como se
 *   distingue un insert de un select sobre la misma tabla.
 * @param {object|null} [opciones.sesion] lo que devuelve `auth.getSession()`.
 */
export function crearSupabaseFalso({ respuestas = {}, sesion = { user: { id: 'usuario-1' } } } = {}) {
  const llamadas = [];

  function desde(nombreTabla) {
    const registro = { tabla: nombreTabla, metodos: [] };
    llamadas.push(registro);

    const consulta = {};

    for (const metodo of ENCADENABLES) {
      consulta[metodo] = (...args) => {
        registro.metodos.push({ nombre: metodo, args });
        return consulta;
      };
    }

    // Hacerla `thenable` es lo que permite escribir `await supabase.from(...)`
    // igual que con el cliente real. La respuesta se resuelve en este momento,
    // no al crear la consulta, para que pueda depender de los métodos que se
    // encadenaron.
    consulta.then = (resolver, rechazar) => {
      const respuesta = respuestas[nombreTabla];
      const valor = typeof respuesta === 'function' ? respuesta(registro) : respuesta;

      return Promise.resolve(valor ?? { data: [], error: null }).then(resolver, rechazar);
    };

    return consulta;
  }

  return {
    from: desde,
    auth: {
      getSession: async () => ({
        data: { session: sesion },
        error: sesion ? null : { message: 'sin sesión' },
      }),
    },
    /** Todo lo que se pidió, en orden. */
    llamadas,
  };
}

/**
 * Llamadas que se hicieron sobre una tabla.
 *
 * @param {{ llamadas: Array }} supabase
 * @param {string} tabla
 */
export function llamadasA(supabase, tabla) {
  return supabase.llamadas.filter((llamada) => llamada.tabla === tabla);
}

/**
 * Lo que se le pasó a un método. Sirve para comprobar qué se envió de verdad.
 *
 * @param {{ metodos: Array }} llamada
 * @param {string} metodo
 */
export function cargaDe(llamada, metodo = 'insert') {
  return llamada?.metodos.find((m) => m.nombre === metodo)?.args[0];
}

/**
 * Un `localStorage` en memoria. Node no trae uno, y los repositorios lo usan
 * para recordar el negocio elegido.
 */
export function memoriaLocal() {
  const datos = new Map();

  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
  };
}
