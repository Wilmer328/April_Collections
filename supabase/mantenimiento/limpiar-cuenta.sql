-- April Collections — vaciar los datos de una cuenta
--
-- Borra clientas, productos, ventas y recordatorios de UNA cuenta. Sirve para
-- dejar limpia una cuenta de pruebas antes de la entrega.
--
-- NO es una migracion: no cambia el esquema y no debe ejecutarse al desplegar.
-- Vive aparte por eso, y para no dejar una operacion destructiva mezclada con
-- los guiones que si hay que correr siempre.
--
-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  ATENCION                                                                │
-- │  Borra TODO lo de esa cuenta, no solo los datos de demostracion. No hay   │
-- │  forma de distinguir las filas sembradas de las capturadas a mano: todas  │
-- │  tienen el mismo owner_id. Lo borrado no se recupera.                     │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- COMO USARLO
--   1. Cambia el correo de abajo por el de la cuenta a vaciar.
--   2. Ejecutalo tal cual: la primera vez solo INFORMA de lo que hay.
--   3. Si el recuento es el esperado, cambia `borrar_de_verdad` a true y
--      vuelve a ejecutarlo.

do $$
declare
  -- Cuenta a vaciar.
  correo constant text := 'CAMBIAME@ejemplo.com';

  -- Traba de seguridad: en false solo cuenta filas, no borra nada. Existe
  -- porque pegar un guion en el editor y darle a Run es demasiado facil como
  -- para que la primera ejecucion sea destructiva.
  borrar_de_verdad constant boolean := false;

  duenio uuid;
  n_clientas int; n_productos int; n_ventas int; n_recordatorios int;
begin
  select id into duenio from auth.users where lower(email) = lower(correo);

  if duenio is null then
    raise exception 'No existe ninguna cuenta con el correo %.', correo;
  end if;

  select count(*) into n_clientas      from public.clientes      where owner_id = duenio;
  select count(*) into n_productos     from public.productos     where owner_id = duenio;
  select count(*) into n_ventas        from public.ventas        where owner_id = duenio;
  select count(*) into n_recordatorios from public.recordatorios where owner_id = duenio;

  if not borrar_de_verdad then
    raise notice 'MODO REVISION. La cuenta % tiene: % clientas, % productos, % ventas, % recordatorios.',
      correo, n_clientas, n_productos, n_ventas, n_recordatorios;
    raise notice 'No se borro nada. Cambia borrar_de_verdad a true para ejecutarlo en serio.';
    return;
  end if;

  -- El orden importa: ventas antes que clientes, porque ventas.cliente_id es
  -- RESTRICT. Las lineas de venta, los abonos y los recordatorios ligados a
  -- una venta se van solos por las claves en cascada.
  delete from public.ventas        where owner_id = duenio;
  delete from public.recordatorios where owner_id = duenio;
  delete from public.clientes      where owner_id = duenio;
  delete from public.productos     where owner_id = duenio;

  -- Las categorias NO se borran: sin ninguna, el formulario de producto se
  -- queda sin rubro donde clasificar y la aplicacion arranca inservible.

  raise notice 'Cuenta % vaciada: % clientas, % productos, % ventas, % recordatorios eliminados.',
    correo, n_clientas, n_productos, n_ventas, n_recordatorios;
end $$;
