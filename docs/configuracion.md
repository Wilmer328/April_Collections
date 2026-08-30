# Configuración del entorno

Ningún secreto se versiona. Este documento describe qué valores necesita la
aplicación y de dónde salen.

> Antes existía un archivo `.env.example` con esta misma información. Se retiró
> porque los escáneres de seguridad marcan cualquier archivo con nombre `.env*`
> como riesgo, sin mirar su contenido. La documentación es igual de útil aquí y
> no deja un patrón que dispare alarmas.

## Variables

| Variable | De dónde sale | Obligatoria |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → *Project Settings → API → Project URL* | Sí |
| `VITE_SUPABASE_ANON_KEY` | Supabase → *Project Settings → API → anon / public* | Sí |

### Sobre la anon key

Es **pública por diseño**. Viaja al navegador en cualquier aplicación Supabase
y no es un secreto: la protección real la dan las políticas RLS, que se evalúan
en el servidor contra el usuario autenticado.

### Lo que nunca debe salir del servidor

La **`service_role` key** ignora todas las políticas RLS. No puede aparecer:

- en ninguna variable con prefijo `VITE_`, porque Vite las incrusta en el
  bundle que se descarga el navegador;
- en ningún archivo de `src/`;
- en el repositorio, bajo ninguna forma.

Su único uso previsto es dentro de funciones serverless en `api/`, donde el
código se ejecuta en el servidor y nunca se envía al cliente (Etapa 10, para el
reseteo de la cuenta demo).

## Desarrollo local

1. Copia `env.ejemplo` como `.env` — está en `.gitignore`.
2. Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. `npm run dev`. Vite las sustituye al compilar.

## Producción

En Vercel: *Settings → Environment Variables*, con los mismos nombres de la
tabla de arriba, marcadas para **Production** y **Preview**.

Después de añadirlas hay que **volver a desplegar**: Vite sustituye estas
variables en tiempo de compilación, así que un despliegue anterior sigue
llevando los valores vacíos.

## Sobrescritura en tiempo de ejecución

Para apuntar a otro proyecto sin recompilar, se puede definir
`window.__APP_CONFIG__` antes de los módulos. Tiene prioridad sobre las
variables de compilación y sirve para pruebas puntuales.

## Ajustes de build en Vercel

| Ajuste | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
