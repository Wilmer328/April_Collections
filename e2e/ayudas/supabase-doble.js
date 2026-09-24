/**
 * Un Supabase de mentira en la frontera de la red.
 *
 * Playwright intercepta cada petición que el navegador hace a
 * https://e2e.supabase.co y responde desde aquí. Del lado de la aplicación no
 * cambia nada: usa el mismo cliente `@supabase/supabase-js`, hace las mismas
 * peticiones HTTP, recibe respuestas con la misma forma. Simplemente nunca
 * llegan a Internet.
 *
 * QUÉ IMITA
 *   /auth/v1/token   inicio de sesión con correo y contraseña
 *   /auth/v1/user    el usuario de la sesión
 *   /auth/v1/logout  cierre de sesión
 *   /rest/v1/<tabla> lecturas y escrituras de PostgREST
 *
 * QUÉ NO IMITA, A PROPÓSITO
 * Las políticas RLS, las restricciones de la base y los disparadores. Eso se
 * prueba con las migraciones y las pruebas de repositorios; aquí se prueba que
 * la interfaz hace lo correcto con lo que el servidor le devuelve.
 *
 * Guarda lo que la aplicación ESCRIBE, para que una prueba pueda afirmar no
 * solo «apareció en pantalla» sino «se envió al servidor con estos datos».
 */

const ORIGEN = 'https://e2e.supabase.co';

/** La persona que entra en las pruebas. */
export const USUARIA = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pruebas@april.test',
  nombre: 'Daysi de Pruebas',
};

/** El negocio al que pertenece. */
export const NEGOCIO = {
  id: '22222222-2222-4222-8222-222222222222',
  nombre: 'April Collections',
};

const CONTRASENA = 'contrasena-de-pruebas';

/** Filas con las que arranca cada prueba. Fechas fijas: nada depende de hoy. */
function datosIniciales() {
  return {
    miembros: [
      { rol: 'propietaria', negocios: { id: NEGOCIO.id, nombre: NEGOCIO.nombre } },
    ],
    categorias: [
      { id: 'cat-1', nombre: 'Joyería', creado_en: '2026-01-01T00:00:00Z' },
      { id: 'cat-2', nombre: 'Perfumes', creado_en: '2026-01-02T00:00:00Z' },
    ],
    clientes: [
      {
        id: 'cli-1', negocio_id: NEGOCIO.id, owner_id: USUARIA.id,
        nombre: 'Ana Martínez', dni: '0801199912345', telefono: '99990001',
        creado_en: '2026-02-01T00:00:00Z',
      },
      {
        id: 'cli-2', negocio_id: NEGOCIO.id, owner_id: USUARIA.id,
        nombre: 'Rosa Pineda', dni: null, telefono: null,
        creado_en: '2026-02-02T00:00:00Z',
      },
    ],
    productos: [
      {
        id: 'pro-1', negocio_id: NEGOCIO.id, owner_id: USUARIA.id,
        nombre: 'Aretes dorados', categoria: 'Joyería',
        costo_centavos: 9000, precio_centavos: 15000, stock: 4,
      },
    ],
    ventas: [
      {
        id: 'ven-1', negocio_id: NEGOCIO.id, cliente_id: 'cli-1',
        fecha: '2026-03-04', tipo_pago: 'credito',
        venta_items: [
          { producto_id: 'pro-1', nombre: 'Aretes dorados', precio_centavos: 15000, costo_centavos: 9000, cantidad: 1 },
        ],
        abonos: [{ monto_centavos: 5000, fecha: '2026-03-04' }],
      },
    ],
    recordatorios: [],

    // Las tablas hijas existen tambien por su cuenta, no solo anidadas dentro
    // de una venta: `repoVentas.crear` inserta en ellas directamente. Sin esto
    // el doble respondia 404, la aplicacion deshacia la venta —como debe— y la
    // prueba fallaba por una carencia del doble, no del producto.
    venta_items: [],
    abonos: [],
  };
}

/**
 * Un JWT con la forma correcta pero sin firma válida.
 *
 * El cliente de Supabase decodifica el token para leer su caducidad, así que
 * tiene que ser un JWT de verdad en estructura. No lo verifica
 * criptográficamente en el navegador —eso lo hace el servidor, que aquí no
 * existe—, por eso basta con una firma cualquiera.
 */
function jwtDeMentira() {
  const ahora = Math.floor(Date.now() / 1000);
  const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');

  const cabecera = b64({ alg: 'HS256', typ: 'JWT' });
  const carga = b64({
    sub: USUARIA.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USUARIA.email,
    session_id: 'sesion-e2e',
    iat: ahora,
    exp: ahora + 12 * 3600,
  });

  return { token: `${cabecera}.${carga}.firma-de-mentira`, exp: ahora + 12 * 3600 };
}

function usuarioDeSupabase() {
  const fecha = '2026-01-01T00:00:00Z';

  return {
    id: USUARIA.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USUARIA.email,
    email_confirmed_at: fecha,
    phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: USUARIA.nombre },
    identities: [],
    created_at: fecha,
    updated_at: fecha,
  };
}

function sesionDeSupabase() {
  const { token, exp } = jwtDeMentira();

  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 12 * 3600,
    expires_at: exp,
    refresh_token: 'refresco-e2e',
    user: usuarioDeSupabase(),
  };
}

/** Cabeceras CORS: el navegador las exige aunque la respuesta sea fingida. */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': '*',
};

function json(ruta, estado, cuerpo, extra = {}) {
  return ruta.fulfill({
    status: estado,
    headers: { ...CORS, 'content-type': 'application/json', ...extra },
    body: cuerpo === undefined ? '' : JSON.stringify(cuerpo),
  });
}

/**
 * Activa el doble en una página.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ tablas: object, escrituras: Array, credenciales: { correo: string, contrasena: string } }>}
 *   `tablas` es el estado vivo (las escrituras lo modifican), `escrituras`
 *   registra cada POST/PATCH/DELETE con su tabla y su cuerpo.
 */
export async function interceptarSupabase(page) {
  const tablas = datosIniciales();
  const escrituras = [];
  let contador = 0;

  await page.route(`${ORIGEN}/**`, async (ruta) => {
    const peticion = ruta.request();
    const metodo = peticion.method();
    const url = new URL(peticion.url());

    // Preflight de CORS: cualquier petición con cabeceras propias lo dispara.
    if (metodo === 'OPTIONS') {
      return ruta.fulfill({ status: 204, headers: CORS });
    }

    // ── Autenticación ──────────────────────────────────────────────────
    if (url.pathname === '/auth/v1/token') {
      const cuerpo = peticion.postDataJSON() ?? {};
      const correcta = cuerpo.email === USUARIA.email && cuerpo.password === CONTRASENA;

      return correcta
        ? json(ruta, 200, sesionDeSupabase())
        : json(ruta, 400, {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
            // Los clientes recientes leen estos dos.
            code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          });
    }

    if (url.pathname === '/auth/v1/user') {
      return json(ruta, 200, usuarioDeSupabase());
    }

    if (url.pathname === '/auth/v1/logout') {
      return ruta.fulfill({ status: 204, headers: CORS });
    }

    // ── PostgREST ──────────────────────────────────────────────────────
    if (url.pathname.startsWith('/rest/v1/')) {
      const tabla = url.pathname.split('/')[3];
      const filas = tablas[tabla];

      if (!filas) {
        return json(ruta, 404, { message: `tabla desconocida en el doble: ${tabla}` });
      }

      // `.single()` pide un objeto en lugar de una lista.
      const quiereUno = (peticion.headers().accept ?? '').includes('pgrst.object');

      if (metodo === 'GET') {
        // Se respetan los filtros `.eq(columna, valor)`, que PostgREST recibe
        // como parametros de consulta `columna=eq.valor`. Sin esto, pedir una
        // venta concreta devolvia siempre la primera de la tabla, y una prueba
        // podia pasar comprobando la fila equivocada.
        let resultado = filas;

        for (const [columna, expresion] of url.searchParams) {
          if (!expresion.startsWith('eq.')) continue;
          const valor = expresion.slice(3);
          resultado = resultado.filter((fila) => String(fila[columna]) === valor);
        }

        // PostgREST anida las tablas hijas cuando el `select` las pide
        // —`venta_items ( ... ), abonos ( ... )`— y la aplicacion cuenta con
        // ello para calcular el total de la venta. Sin anidarlas, toda venta
        // recien creada valia cero.
        if (tabla === 'ventas') {
          resultado = resultado.map((venta) => ({
            ...venta,
            venta_items: venta.venta_items
              ?? tablas.venta_items.filter((i) => i.venta_id === venta.id),
            abonos: venta.abonos
              ?? tablas.abonos.filter((a) => a.venta_id === venta.id),
          }));
        }

        return json(ruta, 200, quiereUno ? resultado[0] ?? null : resultado);
      }

      if (metodo === 'POST') {
        const cuerpo = peticion.postDataJSON();
        const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((fila) => ({
          id: `${tabla}-nuevo-${(contador += 1)}`,
          creado_en: '2026-09-01T00:00:00Z',
          ...fila,
        }));

        filas.push(...nuevas);
        escrituras.push({ metodo, tabla, cuerpo });

        return json(ruta, 201, quiereUno ? nuevas[0] : nuevas);
      }

      if (metodo === 'PATCH' || metodo === 'DELETE') {
        escrituras.push({ metodo, tabla, cuerpo: peticion.postDataJSON() ?? null });
        return json(ruta, 200, quiereUno ? filas[0] ?? null : []);
      }
    }

    // Todo lo demás es una petición que la aplicación no debería estar
    // haciendo: se responde 404 en lugar de dejarla colgada, para que el
    // fallo sea visible y diga qué se pidió.
    return json(ruta, 404, { message: `sin doble para ${metodo} ${url.pathname}` });
  });

  return {
    tablas,
    escrituras,
    credenciales: { correo: USUARIA.email, contrasena: CONTRASENA },
  };
}

/**
 * Entra con correo y contraseña por la interfaz, como lo haría una persona.
 *
 * Devuelve ya dentro de la aplicación. Las pruebas que empiezan «una vez
 * dentro» lo usan para no repetir el recorrido del login.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ correo: string, contrasena: string }} credenciales
 */
export async function entrarComoUsuaria(page, credenciales) {
  await page.goto('/login.html');
  await page.getByLabel('Correo').fill(credenciales.correo);
  await page.getByLabel('Contraseña').fill(credenciales.contrasena);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // La pantalla de sesión activa ofrece el paso a la aplicación.
  await page.getByRole('link', { name: 'Entrar a la aplicación' }).click();
  await page.waitForURL(/\/app(\.html)?/);
}
