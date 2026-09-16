# ADR-0005 — Pruebas de extremo a extremo contra un Supabase interceptado

- **Estado:** Aceptada
- **Fecha:** 2026-09-16
- **Decide:** Wilmer Sánchez

## Contexto

El proyecto tenía 214 pruebas unitarias sobre el dominio y los repositorios,
pero ninguna que abriera la aplicación compilada en un navegador y la usara
como lo hace una persona: escribir en un formulario, pulsar un botón, ver que
aparece lo que debía aparecer.

Ese hueco es real. Las pruebas unitarias verifican que `repoClientes.crear()`
envía `negocio_id`; no verifican que el botón «Agregar cliente(a)» llame a esa
función, ni que la lista se repinte después, ni que el formulario se vacíe.
Cuatro buscadores estuvieron rotos durante días porque el atributo `oninput`
llamaba a funciones que no estaban expuestas en `window`, y ninguna prueba
unitaria podía verlo: el fallo estaba en la unión entre el HTML y el módulo,
no dentro de ninguno de los dos.

Al añadir pruebas E2E con Playwright había que decidir **qué hay al otro lado
de la red**. La aplicación habla con Supabase para todo: autenticación, datos
y políticas de acceso.

## Decisión

Las pruebas E2E corren contra el **build de producción** servido con `vite
preview`, en un **navegador real** (Chromium), con **Supabase interceptado en
la red**: Playwright captura cada petición a `https://e2e.supabase.co` y
responde desde un doble en `e2e/ayudas/supabase-doble.js`.

Del lado de la aplicación no cambia nada. Usa el mismo cliente
`@supabase/supabase-js`, hace las mismas peticiones HTTP con las mismas
cabeceras, recibe respuestas con la misma forma que devolvería PostgREST. La
única diferencia es que nunca llegan a Internet.

El build de pruebas se compila con credenciales que apuntan a un dominio
inexistente. Si alguna petición escapara al doble, fallaría de forma visible en
lugar de tocar un proyecto real.

Son **seis pruebas**. La punta de la pirámide es angosta a propósito.

| Prueba | Qué recorre |
|---|---|
| La portada carga y lleva al inicio de sesión | Público, sin sesión |
| La aplicación sin sesión expulsa al inicio de sesión | Control de acceso desde el navegador |
| Una contraseña incorrecta no entra y lo dice | Manejo de error sin filtrar qué falló |
| Entra con correo y contraseña y llega a la aplicación | Autenticación completa |
| Ve las clientas del negocio y quién debe | Lectura, y el cálculo de saldo en el cliente |
| Registra una clienta y la envía al servidor con su negocio | Escritura, con lo que se envió de verdad |

La última afirma no solo «apareció en pantalla» sino «se envió al servidor con
`negocio_id`». Se verificó reinyectando el fallo que dejó a la dueña sin poder
entrar: la prueba lo detecta.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **Supabase real con la cuenta de demostración** | Exige la contraseña de la demo como secreto en CI. Cada ejecución escribe clientas de prueba en la base real y hay que limpiarlas. Y el pipeline se pone rojo cuando Supabase está lento o caído —como le pasó a SonarCloud durante este mismo proyecto— sin que nadie haya roto nada. Es exactamente el tipo de prueba que «termina apagando el pipeline»: cuando falla por causas ajenas, el equipo aprende a ignorarla. |
| **Sesión inyectada en `localStorage`, saltándose el login** | Más rápido, pero deja sin probar el flujo que más importa: entrar. Y la prueba de contraseña incorrecta sería imposible. |
| **Sin E2E; más pruebas unitarias sobre el HTML** | Ya existen (`tests/app-handlers.test.js` lee el HTML como texto). Encuentran que un manejador no está en `window`, pero no que la pantalla se repinta mal ni que un botón no hace nada. |

## Lo que esto NO prueba, y dónde se prueba

- **Las políticas RLS.** El doble devuelve lo que se le pide; no rechaza nada
  por permisos. Eso se prueba con las migraciones idempotentes y se verificó
  en producción con dos cuentas.
- **Las restricciones de la base** (NOT NULL, claves foráneas, índices únicos).
  Están en las migraciones, no en el doble.
- **El middleware de Vercel** (`/panel` → 302). `vite preview` no lo ejecuta.
  Se verificó con `curl` contra el dominio real.
- **Google OAuth.** No se puede automatizar sin una cuenta real de Google en
  CI, y no debería: la prueba del login con correo cubre el mismo camino de
  la aplicación desde el retorno en adelante.

## Consecuencias

**A favor**

- Deterministas: no dependen de la red, de la hora, ni de datos que alguien
  cambió en la base.
- Sin secretos en CI.
- Corren en un job aparte y en paralelo: no alargan el pipeline. Seis pruebas
  tardan menos de diez segundos; instalar Chromium, alrededor de un minuto.
- Guardan lo que la aplicación **escribe**, así que una prueba puede afirmar
  sobre la petición enviada, no solo sobre la pantalla.

**En contra**

- El doble puede quedar desfasado respecto a PostgREST si Supabase cambia la
  forma de sus respuestas. Se mitiga usando el cliente oficial, que es quien
  interpreta esas respuestas: si la forma cambia, el cliente falla en las
  pruebas igual que fallaría en producción.
- Un fallo *dentro* de Supabase no se ve aquí. Es deliberado: cada capa se
  prueba donde vive.

## Verificación

- `npm run test:e2e` — las seis en verde en menos de diez segundos.
- Reinyectar el fallo de `negocio_id` en `clientes.crear()` hace fallar
  exactamente la sexta prueba, con `negocio_id` esperado y ausente.
- El job «Recorrido en navegador» corre en paralelo con «Pruebas y build» en
  cada push y pull request.

## Referencias

- Configuración: `playwright.config.js`
- Doble de Supabase: `e2e/ayudas/supabase-doble.js`
- Pruebas: `e2e/*.spec.js`
- Pipeline: `.github/workflows/ci.yml`, job `extremo-a-extremo`
