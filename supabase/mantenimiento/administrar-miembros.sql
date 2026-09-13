-- April Collections — dar y quitar acceso a un negocio
--
-- Las membresías no se administran desde la aplicación: no hay pantalla para
-- invitar gente. Se hace aquí, a conciencia, porque dar acceso a un negocio
-- significa dar acceso a los datos de las clientas de alguien.
--
-- NO es una migración: no cambia el esquema y no debe ejecutarse al desplegar.
--
-- ANTES DE DAR ACCESO AL NEGOCIO REAL, PIÉNSALO
-- Contiene nombres, teléfonos y DNI de personas que no son usuarias de la
-- aplicación y que nunca consintieron aparecer en ella. Para enseñar el
-- producto está el negocio «Demostracion», con datos inventados.

-- ── Ver quién tiene acceso a qué ──────────────────────────────────────────
select
  n.nombre    as negocio,
  u.email     as persona,
  m.rol,
  m.creado_en
from public.miembros m
join public.negocios n on n.id = m.negocio_id
join auth.users u      on u.id = m.usuario_id
order by n.nombre, m.rol, u.email;

-- ── Dar acceso ────────────────────────────────────────────────────────────
-- Cambia los tres valores y ejecuta. Es idempotente: si ya era miembro, solo
-- se actualiza su rol.
do $$
declare
  -- ┌──────────────────────────────────────────────────────────────────────┐
  -- │  RELLENA ESTOS TRES VALORES                                          │
  -- └──────────────────────────────────────────────────────────────────────┘
  correo         constant text := 'CAMBIAME@ejemplo.com';
  nombre_negocio constant text := 'Demostracion';        -- o 'April Collections'
  rol_asignado   constant text := 'administrador';       -- propietaria | administrador | lector

  -- Puesto en true, ejecuta. En false solo comprueba que los datos existen.
  aplicar constant boolean := false;

  id_usuario uuid;
  id_negocio uuid;
begin
  select id into id_usuario from auth.users where lower(email) = lower(correo);
  select id into id_negocio from public.negocios where lower(nombre) = lower(nombre_negocio);

  if id_usuario is null then
    raise exception 'No existe ninguna cuenta con el correo %. Tiene que iniciar sesion una vez primero.', correo;
  end if;

  if id_negocio is null then
    raise exception 'No existe el negocio "%". Los que hay: %.',
      nombre_negocio,
      (select string_agg(nombre, ', ') from public.negocios);
  end if;

  if not aplicar then
    raise notice 'MODO REVISION. Todo correcto: % se anadiria a "%" como %.',
      correo, nombre_negocio, rol_asignado;
    raise notice 'No se hizo nada. Pon aplicar en true para ejecutarlo de verdad.';
    return;
  end if;

  insert into public.miembros (negocio_id, usuario_id, rol)
  values (id_negocio, id_usuario, rol_asignado)
  on conflict (negocio_id, usuario_id) do update set rol = excluded.rol;

  raise notice 'Listo: % es % en "%".', correo, rol_asignado, nombre_negocio;
end $$;

-- ── Quitar acceso ─────────────────────────────────────────────────────────
-- Descomenta y rellena. Quien pierde la membresía deja de ver esos datos en su
-- siguiente consulta: las políticas RLS lo resuelven en el servidor, sin que
-- haga falta cerrarle la sesión.
--
-- delete from public.miembros
-- where usuario_id = (select id from auth.users where lower(email) = lower('CAMBIAME@ejemplo.com'))
--   and negocio_id = (select id from public.negocios where lower(nombre) = lower('Demostracion'));
