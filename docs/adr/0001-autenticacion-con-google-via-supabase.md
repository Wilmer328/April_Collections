# ADR-0001 — Autenticación con Google mediante Supabase Auth

- **Estado:** Aceptada
- **Fecha:** 2026-08-28
- **Decide:** Wilmer Sánchez

## Contexto

April Collections nació como un archivo HTML único que guardaba todo en
`localStorage`. No tenía usuarios: cualquiera que abriera el archivo veía los
datos de ese navegador, y esos datos no salían de ahí.

Para convertirlo en un producto publicable hace falta identificar quién usa la
aplicación, por dos razones:

1. **Separar los datos por dueño.** Sin identidad no se puede decir "estos
   clientes son de esta usuaria", y por lo tanto no se pueden escribir
   políticas RLS en Supabase.
2. **Permitir el mismo negocio desde varios dispositivos.** Es el motivo por el
   que se abandona `localStorage` como única persistencia.

La usuaria objetivo administra un negocio de venta por catálogo desde el
teléfono. No es una usuaria técnica.

## Decisión

Usar **Supabase Auth con Google como único proveedor de identidad**, mediante
el flujo OAuth 2.0 que expone `signInWithOAuth({ provider: 'google' })`.

La lógica de sesión queda aislada en `src/auth/session.js`. La interfaz nunca
llama a `supabase.auth.*` directamente: solo usa las funciones de ese módulo,
que además normalizan el usuario de Supabase a un modelo propio
(`id`, `email`, `nombre`, `avatarUrl`).

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **Correo y contraseña** | Obliga a la usuaria a crear y recordar otra contraseña, y nos obliga a construir recuperación de contraseña, verificación de correo y política de contraseñas. Es más superficie de ataque para cero beneficio en este caso. |
| **Magic link por correo** | No exige contraseña, pero cada inicio de sesión depende de abrir el correo. En un teléfono, y para uso diario, la fricción es alta. |
| **Auth0 / Firebase Auth** | Funcionan bien, pero añaden un proveedor más que administrar y que sustentar. Supabase ya es la base de datos del proyecto y trae autenticación integrada con el mismo JWT que consumen las políticas RLS. |
| **Sin autenticación** | Se descarta: sin identidad no hay RLS, y sin RLS no hay forma de exponer una base de datos compartida sin filtrar los datos de una usuaria a otra. |

## Consecuencias

**A favor**

- La usuaria entra con una cuenta que ya tiene y ya usa en su teléfono.
- El proyecto no almacena ni valida contraseñas: no puede filtrar lo que no guarda.
- El JWT que emite Supabase alimenta directamente las políticas RLS
  (`owner_id = auth.uid()`), así que autenticación y autorización quedan atadas.
- Un solo proveedor que administrar.

**En contra**

- **Iniciar sesión exige conexión.** El flujo OAuth es una redirección a Google.
  Esto marca una frontera dura del modo offline y hay que documentarlo: con
  sesión ya establecida se puede trabajar sin red, pero autenticarse no.
- Se depende de que Google esté disponible.
- Quien no tenga cuenta de Google no puede entrar. Se acepta porque la usuaria
  objetivo y el evaluador del curso la tienen.

**Deuda asumida**

- La protección de rutas todavía no está conectada a `app.html`. Se hará en la
  Etapa 4, junto con las políticas RLS. Un guard en el cliente sin RLS detrás
  daría una falsa sensación de seguridad: se salta desactivando JavaScript. La
  barrera real es RLS; el guard solo mejora la experiencia.

## Configuración externa requerida

Estos pasos son manuales y los ejecuta el autor; no pueden versionarse:

1. **Google Cloud Console** — crear credenciales OAuth 2.0 de tipo
   *Aplicación web* y registrar como *Authorized redirect URI* la URL de
   callback que muestra Supabase.
2. **Supabase** — *Authentication → Providers → Google*: activar el proveedor y
   pegar el Client ID y el Client Secret de Google.
3. **Supabase** — *Authentication → URL Configuration*: registrar el Site URL y
   las Redirect URLs del dominio de producción y de los previews de Vercel.

## Verificación

- Sin configuración de Supabase, `/login` deshabilita el botón y explica el
  estado en pantalla, en vez de fallar con un error de red.
- Con configuración, `/login` redirige a Google y al volver muestra el nombre,
  el correo y el avatar de la cuenta, con opción de cerrar sesión.
- Tras recargar la página la sesión persiste (`persistSession: true`).

## Referencias

- Implementación: `src/auth/session.js`, `src/data/supabaseClient.js`, `login.html`
- Configuración: `config.example.js`, `.env.example`
