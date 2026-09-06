-- April Collections — comprobar el estado de los datos
--
-- Responde a tres preguntas distintas:
--
--   1. ¿Cuánto hay guardado, y de quién?
--   2. ¿Se está escribiendo de verdad? (lo más reciente, con su hora)
--   3. ¿Los datos son coherentes entre sí?
--
-- La tercera es la que importa. Contar filas solo demuestra que algo se
-- guardó; estas comprobaciones buscan lo que estaría MAL aunque el recuento
-- pareciera correcto: ventas sin líneas, abonos que superan la deuda,
-- recordatorios vivos de deudas ya pagadas.
--
-- Solo lee. No modifica nada, se puede ejecutar cuando sea.

-- ── 1. Qué hay guardado, por cuenta ───────────────────────────────────────
select
  u.email                                                              as cuenta,
  (select count(*) from public.categorias    c where c.owner_id = u.id) as categorias,
  (select count(*) from public.clientes      c where c.owner_id = u.id) as clientas,
  (select count(*) from public.productos     p where p.owner_id = u.id) as productos,
  (select count(*) from public.ventas        v where v.owner_id = u.id) as ventas,
  (select count(*) from public.recordatorios r where r.owner_id = u.id) as recordatorios
from auth.users u
order by u.email;

-- ── 2. Lo último que se escribió ──────────────────────────────────────────
-- Si acabas de guardar algo en la aplicación, debe aparecer aquí arriba con
-- la hora de hace un momento. Es la prueba de que la escritura llegó.
select 'cliente'      as tipo, c.nombre                        as detalle, c.creado_en
from public.clientes c
union all
select 'producto',    p.nombre,                                p.creado_en
from public.productos p
union all
select 'venta',       'de ' || cl.nombre,                      v.creado_en
from public.ventas v join public.clientes cl on cl.id = v.cliente_id
union all
select 'abono',       'L ' || (a.monto_centavos / 100.0)::text, a.creado_en
from public.abonos a
union all
select 'recordatorio', 'para ' || cl.nombre,                   r.creado_en
from public.recordatorios r join public.clientes cl on cl.id = r.cliente_id
order by creado_en desc
limit 15;

-- ── 3. Comprobaciones de coherencia ───────────────────────────────────────
-- Todo lo que salga aquí es un problema real. Sin filas, los datos están bien.
with problemas as (

  -- Una venta sin líneas no tiene importe: quedaría en cero y falsearía el
  -- resumen del mes. Suele ser señal de una escritura que se cortó a medias.
  select 'venta sin productos' as problema,
         v.id::text as afectado,
         'del ' || v.fecha as detalle
  from public.ventas v
  where not exists (select 1 from public.venta_items i where i.venta_id = v.id)

  union all

  -- Cobrar más de lo que se debe. La aplicación lo impide, pero si ocurriera
  -- por una escritura directa, el saldo pendiente saldría en cero y la
  -- diferencia se perdería sin dejar rastro.
  select 'abonos por encima del total',
         s.id::text,
         'cobrado L ' || (s.cobrado_centavos / 100.0)::text ||
         ' sobre un total de L ' || (s.total_centavos / 100.0)::text
  from public.ventas_con_saldo s
  where s.cobrado_centavos > s.total_centavos

  union all

  -- Un recordatorio pendiente de una venta ya saldada: la usuaria recibiría
  -- avisos para cobrar algo que ya está pagado. Es justo lo que debe cerrarse
  -- solo al registrar el último abono.
  select 'recordatorio vivo de deuda saldada',
         r.id::text,
         'del ' || r.fecha
  from public.recordatorios r
  join public.ventas_con_saldo s on s.id = r.venta_id
  where r.estado = 'pendiente' and s.pendiente_centavos = 0

  union all

  -- Una línea de venta cuyo producto sigue en el catálogo pero con otro
  -- nombre. No es un error: es la copia histórica funcionando. Aparece aquí
  -- solo para poder distinguirlo de un fallo si alguien lo ve raro.
  select 'nombre historico distinto al del catalogo (esperado)',
         i.id::text,
         i.nombre || ' -> ahora ' || p.nombre
  from public.venta_items i
  join public.productos p on p.id = i.producto_id
  where i.nombre <> p.nombre
)
select * from problemas order by problema;
