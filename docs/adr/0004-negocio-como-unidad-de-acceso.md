# ADR-0004 — El negocio, y no la persona, como unidad de acceso

- **Estado:** Aceptada
- **Fecha:** 2026-09-12
- **Decide:** Wilmer Sánchez

## Contexto

El esquema inicial puso `owner_id` en cada tabla del negocio y las políticas RLS
preguntaban «¿esta fila es tuya?». Es el modelo de un servicio con muchos
negocios independientes, donde cada cliente es un mundo aparte.

April Collections no es eso. Es **un** negocio al que acceden varias personas:
la dueña, quien la ayuda, y el evaluador del curso.

El fallo no era teórico. Al probar en producción se vio que entrar con una
cuenta y con otra mostraba datos distintos: si la dueña registraba una venta y
su hijo entraba desde su propia cuenta a ayudarla, **no la veía**. Estaban
trabajando sobre dos negocios paralelos sin saberlo, y lo que capturaba uno no
le servía al otro.

Modelar «usuario» donde debía haber «negocio» no se corrige ajustando una
política: hay que cambiar de qué cuelgan los datos.

## Decisión

Introducir **negocio** como propietario de los datos, y **membresía con rol**
como forma de acceder a él.

```
negocios   id, nombre
miembros   negocio_id, usuario_id, rol
```

| Rol | Puede |
|---|---|
| `propietaria` | Todo sobre los datos |
| `administrador` | Todo sobre los datos |
| `lector` | Solo consultar |

Las cinco tablas del negocio ganan `negocio_id`, y las políticas pasan de
`owner_id = auth.uid()` a preguntar por la membresía:

```sql
using (negocio_id in (select public.negocios_del_usuario()))
```

La escritura usa una función distinta, `negocios_que_puede_escribir()`, que
excluye al rol `lector`. Separar lectura y escritura permite que un rol de
consulta exista de verdad, verificado en el servidor.

Ambas funciones son `security definer`. Es necesario: una política sobre
`miembros` que consultara `miembros` provocaría recursión infinita en Postgres.

## Lo que esto NO es

**No convierte la aplicación en un servicio multiempresa.** Hay exactamente dos
negocios, creados por la migración:

| Negocio | Miembros | Datos |
|---|---|---|
| April Collections | La dueña y quien la ayuda | Reales |
| Demostracion | El evaluador del curso | Inventados |

No existe registro público, ni pantalla para crear negocios, ni para invitar
miembros. Las membresías se administran desde el panel de Supabase con
`supabase/mantenimiento/administrar-miembros.sql`.

Esa fricción es deliberada: dar acceso a un negocio es dar acceso a los datos
personales de las clientas de alguien, y no debería ser tan fácil como pulsar un
botón.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **Dejarlo como estaba** | El producto queda roto para su uso real: dos personas no pueden administrar el mismo negocio. |
| **Compartir una sola cuenta entre todos** | Resuelve ver lo mismo, pero se pierde saber quién registró cada venta, y compartir contraseña es exactamente lo que el proyecto evita al usar OAuth. |
| **Una lista de «cuentas que pueden ver mis datos»** | Menos tablas, pero es el mismo concepto con peor nombre: sigue habiendo un dueño y unos invitados, y no admite roles sin volverse enrevesado. |
| **Un solo negocio, sin tabla de negocios** | Se acabaría el problema de la separación, pero también el aislamiento entre los datos reales y los de demostración, que es lo que protege a las clientas de la dueña. |

## Consecuencias

**A favor**

- Varias personas administran el mismo negocio y ven exactamente lo mismo.
- El rol permite dar acceso de solo lectura sin confiar en la interfaz: la
  restricción se evalúa en Postgres.
- Los datos reales y los de demostración quedan aislados por diseño, no por
  usar cuentas distintas.
- `owner_id` deja de decidir el acceso y pasa a ser trazabilidad: quién registró
  cada fila, que es información útil cuando trabajan dos personas.

**En contra**

- Cada consulta incluye una subconsulta sobre `miembros`. El índice por usuario
  lo resuelve, y es el precio de tener autorización real en la base.
- Hay que administrar las membresías fuera de la aplicación.
- La caché local pasa a distinguir usuario **y** negocio: sin eso, quien
  pertenece a dos vería mezcladas las clientas reales con las inventadas.

**Deuda asumida**

- `owner_id` conserva su nombre aunque ya no signifique propiedad sino autoría.
  No se renombró en la misma migración que cambia la autorización: un fallo en
  un renombrado cosmético no debe poder comprometer un cambio de seguridad.
  Queda pendiente.

## Verificación

- Entrar con dos cuentas miembro del mismo negocio muestra **los mismos datos**.
- Entrar con una cuenta del negocio de demostración no muestra ninguna clienta
  real. Es la prueba de que el aislamiento funciona.
- Una cuenta sin ninguna membresía recibe un mensaje explicándolo, en lugar de
  una aplicación vacía que parecería un negocio sin ventas.
- Cambiar de negocio en el selector recarga y muestra otro conjunto de datos.

## Referencias

- Migración: `supabase/migrations/0006_negocios_y_miembros.sql`
- Administración: `supabase/mantenimiento/administrar-miembros.sql`
- Decisión relacionada: [ADR-0003](0003-acceso-demo-con-credenciales-propias.md)
