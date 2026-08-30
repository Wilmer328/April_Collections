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

Mientras el proyecto no inyecte variables en tiempo de build, la configuración
se carga en tiempo de ejecución:

1. Copia `config.example.js` como `config.js` — está en `.gitignore`.
2. Rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3. Enlázalo en `login.html` y `app.html`, antes de los módulos:
   `<script src="./config.js"></script>`

## Producción

En Vercel: *Settings → Environment Variables*. Se definen con los mismos
nombres de la tabla de arriba, para los entornos Production y Preview.

## Ajustes de build en Vercel

| Ajuste | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
