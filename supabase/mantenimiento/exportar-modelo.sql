-- April Collections — exportar el esquema real a JSON
--
-- Genera el contenido de docs/db-export.json leyendo el catalogo de PostgreSQL:
-- tablas, columnas con su tipo, claves primarias, indices, claves foraneas,
-- politicas RLS y el numero real de filas de cada tabla.
--
-- Se lee de la base y no se escribe a mano a proposito: un modelo redactado
-- aparte se desincroniza del esquema en cuanto alguien anade una columna, y
-- entonces documenta algo que no existe.
--
-- COMO USARLO
--   1. Pegalo en el SQL Editor de Supabase y ejecutalo.
--   2. La consulta devuelve UNA celda con todo el JSON. Pulsa sobre ella y
--      copia su contenido.
--   3. Guardalo en docs/db-export.json del repositorio.
--
-- El recuento de filas es exacto, no estimado: se obtiene ejecutando un
-- count(*) real sobre cada tabla mediante query_to_xml. Las estimaciones de
-- pg_class.reltuples son mucho mas rapidas, pero devuelven -1 en tablas que
-- nunca han pasado por ANALYZE, que es justo el caso de una base recien creada.

select jsonb_pretty(
  jsonb_build_object(
    'generado_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'motor', 'postgres',
    'tablas', coalesce(jsonb_agg(tabla order by tabla ->> 'nombre'), '[]'::jsonb)
  )
)
from (
  select jsonb_build_object(
    'nombre', c.relname,

    -- Recuento real de filas.
    'filas', (
      xpath(
        '/row/cnt/text()',
        query_to_xml(format('select count(*) as cnt from public.%I', c.relname), false, true, '')
      )
    )[1]::text::bigint,

    -- Columnas con tipo, si son clave primaria y si admiten nulos.
    'columnas', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'nombre', a.attname,
          'tipo', format_type(a.atttypid, null),
          'pk', coalesce(pk.es_clave, false),
          'nulo', not a.attnotnull
        ) order by a.attnum
      ), '[]'::jsonb)
      from pg_attribute a
      left join lateral (
        select true as es_clave
        from pg_constraint k
        where k.conrelid = c.oid
          and k.contype = 'p'
          and a.attnum = any (k.conkey)
      ) pk on true
      where a.attrelid = c.oid
        and a.attnum > 0
        and not a.attisdropped
    ),

    -- Indices declarados sobre la tabla.
    'indices', (
      select coalesce(jsonb_agg(i.relname order by i.relname), '[]'::jsonb)
      from pg_index x
      join pg_class i on i.oid = x.indexrelid
      where x.indrelid = c.oid
    ),

    -- Claves foraneas: de que columna a que tabla y columna.
    'relaciones', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'columna', origen.attname,
          'referencia', destino_tabla.relname || '.' || destino.attname
        ) order by origen.attname
      ), '[]'::jsonb)
      from pg_constraint f
      join lateral unnest(f.conkey, f.confkey) as claves(origen_num, destino_num) on true
      join pg_attribute origen
        on origen.attrelid = f.conrelid and origen.attnum = claves.origen_num
      join pg_attribute destino
        on destino.attrelid = f.confrelid and destino.attnum = claves.destino_num
      join pg_class destino_tabla on destino_tabla.oid = f.confrelid
      where f.conrelid = c.oid and f.contype = 'f'
    ),

    -- Politicas de seguridad a nivel de fila.
    'politicas_rls', (
      select coalesce(jsonb_agg(p.policyname order by p.policyname), '[]'::jsonb)
      from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
    )
  ) as tabla

  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'          -- solo tablas: las vistas no tienen filas propias
  order by c.relname
) as tablas;
