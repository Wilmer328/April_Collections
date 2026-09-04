# ADR-0003 — Acceso demo con credenciales propias

- **Estado:** Aceptada
- **Fecha:** 2026-09-03
- **Decide:** Wilmer Sánchez
- **Modifica:** [ADR-0001](0001-autenticacion-con-google-via-supabase.md)

## Contexto

El [ADR-0001](0001-autenticacion-con-google-via-supabase.md) fijó **Google como
único proveedor de identidad**, y las razones siguen siendo válidas para la
usuaria real: entra con una cuenta que ya tiene, y el proyecto no almacena
contraseñas.

Pero el proyecto tiene un segundo tipo de acceso que ese ADR no contempló: el
del **evaluador del curso**, que debe poder recorrer el producto funcionando.
Ahí Google no sirve, y por un motivo que no es técnico sino de datos.

Los datos de la aplicación están separados por dueño (`owner_id`), y las
políticas RLS impiden ver los de otra persona. Es exactamente lo que se quiere
—y lo que se defiende en el ADR-0001— pero tiene una consecuencia: si el
evaluador entra con su propia cuenta de Google, entra a una cuenta **vacía**.
Vería una aplicación técnicamente correcta que aparenta no hacer nada.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **El evaluador entra con su propio Google** | Respeta el ADR-0001 sin cambios, pero lo deja frente a una aplicación vacía. El recorrido guiado que pide el entregable 11 no tendría nada que enseñar. |
| **Sembrar datos de ejemplo a cada usuario nuevo** | Resolvería lo anterior, pero entonces la usuaria real también recibiría clientas inventadas mezcladas con las suyas al entrar por primera vez. Peor que el problema. |
| **Compartir la cuenta real de la dueña** | Expondría nombres completos, teléfonos y DNI de sus clientas, que son terceras personas que nunca consintieron aparecer en una evaluación académica. Además el evaluador podría alterar datos reales del negocio. Contradice directamente lo que este mismo proyecto documenta sobre protección de datos. |
| **Una cuenta de Google compartida para la demo** | Funciona, pero obliga a crear y mantener una cuenta de Google adicional, y a compartir sus credenciales completas —que dan acceso a correo y a todo lo demás de esa cuenta—. Desproporcionado. |

## Decisión

Habilitar **adicionalmente** el proveedor de correo y contraseña de Supabase
Auth, y crear **una única cuenta** dedicada a la demostración, con datos
ficticios sembrados por `supabase/migrations/0003_datos_demo.sql`.

Google sigue siendo el proveedor de la usuaria real. El correo y contraseña
existen para un solo propósito y una sola cuenta.

## Consecuencias

**A favor**

- El evaluador ve el producto funcionando: clientas, ventas con deuda parcial,
  inventario con existencias, recordatorios en sus tres estados.
- Los datos son inventados. Ninguna clienta real aparece.
- Puede modificar y borrar lo que quiera sin tocar el negocio real: son cuentas
  distintas y RLS las mantiene separadas.
- El guion de siembra es idempotente, así que restablecer la demostración es
  volver a ejecutarlo.

**En contra**

- Se abre un segundo camino de autenticación, que es superficie de ataque
  adicional. Se acepta porque afecta a una sola cuenta cuyos datos son ficticios
  y desechables.
- Hay que custodiar esa contraseña. Si se filtra, lo que se expone es un negocio
  inventado.

**Lo que NO cambia**

- La usuaria real sigue entrando solo con Google.
- Las políticas RLS son idénticas para ambas cuentas: la demo no tiene
  privilegios especiales. Es un usuario más, con sus propios datos.

## Verificación

- Entrar con la cuenta demo muestra el negocio ficticio completo.
- Entrar con una cuenta de Google distinta muestra una cuenta vacía, no los
  datos de la demo. Es la prueba de que RLS funciona.
- Volver a ejecutar `0003_datos_demo.sql` devuelve la demostración a su estado
  inicial.

## Configuración externa requerida

Manual, la ejecuta el autor:

1. **Supabase → Authentication → Providers**: activar *Email* junto a Google.
2. **Supabase → Authentication → Users → Add user**: crear la cuenta demo con
   *Auto Confirm User* marcado.
3. Poner ese correo en la constante `correo_demo` de
   `supabase/migrations/0003_datos_demo.sql` y ejecutar el guion.

## Referencias

- Siembra: `supabase/migrations/0003_datos_demo.sql`
- Decisión que modifica: [ADR-0001](0001-autenticacion-con-google-via-supabase.md)
- Modelo y políticas: [docs/data-model](../data-model/README.md)
