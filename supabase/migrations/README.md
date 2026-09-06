# Migraciones

Se ejecutan **en orden numérico** desde el SQL Editor de Supabase.

| # | Archivo | Qué hace |
|---|---------|----------|
| 0000 | `0000_registro_de_migraciones.sql` | Tabla que registra qué migraciones se aplicaron |
| 0001 | `0001_esquema_inicial.sql` | 8 tablas, índices y la vista de saldos |
| 0002 | `0002_politicas_rls.sql` | RLS, políticas y alta automática del perfil |
| 0003 | `0003_datos_demo.sql` | Negocio ficticio para la cuenta demo |
| 0004 | `0004_control_de_acceso.sql` | Lista de correos autorizados |
| 0005 | `0005_kpis.sql` | Vistas de los indicadores del negocio |

## Todas son idempotentes

Volver a ejecutar cualquiera **no falla ni duplica nada**. Es deliberado: una
migración que solo se puede correr una vez obliga a recordar si ya se corrió, y
recordar no es una garantía.

| Objeto | Cómo se consigue |
|---|---|
| Tablas e índices | `IF NOT EXISTS` |
| Vistas y funciones | `OR REPLACE` |
| Políticas | `DROP POLICY IF EXISTS` antes de crear — PostgreSQL no admite `IF NOT EXISTS` en políticas |
| Disparadores | `DROP TRIGGER IF EXISTS` antes de crear |
| Datos sembrados | Se borra lo anterior de esa cuenta antes de insertar |
| Autorizados | `ON CONFLICT DO NOTHING` |

## Comprobar qué está aplicado

```sql
select * from public.migraciones order by version;
```

Cada guion se registra a sí mismo al terminar. La tabla dice lo que **realmente**
se aplicó; los archivos dicen lo que **debería** estar aplicado.

## Scripts que NO son migraciones

En [`../mantenimiento/`](../mantenimiento/) hay guiones que no cambian el
esquema y **no deben ejecutarse al desplegar**: exportar el modelo, verificar la
integridad de los datos y vaciar una cuenta. Están aparte a propósito: mezclar
una operación destructiva con los guiones que sí hay que correr siempre es pedir
un accidente.
