# April Collections

Sistema de gestión para un negocio de venta por catálogo: registra ventas,
lleva el control de quién debe cuánto, administra el inventario, calcula
precios por margen y avisa de los cobros prometidos.

Proyecto Capstone de Ingeniería de Software 2.

---

## Cliente

**Daysi Rosario Gomez** — April Collections, negocio de venta por catálogo
(joyería, maquillaje, sandalias y perfumes) en Honduras.

### Problema que se resolvió

El negocio llevaba las cuentas en un cuaderno. Eso implicaba tres problemas
concretos: el historial se perdía si el cuaderno se extraviaba, los abonos
parciales quedaban anotados sueltos y nadie sabía con certeza quién debía
cuánto, y los cobros prometidos se olvidaban.

### Funcionalidad construida

Una aplicación web con seis módulos conectados entre sí:

| Módulo | Qué resuelve |
|---|---|
| Resumen del mes | Ventas, ganancia, margen y saldo por cobrar del período |
| Registro de ventas | Varios productos por venta, al contado, con abono inicial o a crédito; descuenta el stock |
| Clientes | Historial de compras y saldo pendiente por persona |
| Inventario | Catálogo por categoría con costo, precio, margen y existencias |
| Calculadora de precios | Precio de venta a partir del margen deseado |
| Recordatorios de cobro | Agenda del cobro prometido, con cierre automático al saldarse la deuda |

La regla que une el sistema: al registrar un abono, el saldo de la clienta y
el recordatorio asociado se actualizan solos.

---

## Estado del proyecto

| Área | Estado |
|---|---|
| Aplicación funcional | ✅ 6 módulos operativos |
| Landing, login y portal privado | ✅ publicados en dominio propio |
| Capa de dominio con pruebas | ✅ 166 pruebas |
| Build y entorno de pruebas | ✅ Vite + Vitest |
| Autenticación con Google | ✅ en producción |
| Persistencia en Supabase | ✅ 9 tablas con RLS |
| Caché local para trabajar sin conexión | ✅ |
| PWA instalable y modo offline | ✅ |
| Integración continua | ✅ GitHub Actions |
| SonarCloud | ⏳ configuración lista, falta conectarlo |

## Cómo ejecutarlo

```bash
npm install
npm run dev          # servidor de desarrollo
npm run build        # genera dist/
npm test             # 166 pruebas
npm run test:coverage
```

Requiere Node 20 o superior.

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Landing pública | Abierta |
| `/login` | Inicio de sesión | Abierta |
| `/app` | Aplicación | Requiere sesión |
| `/panel` | Portal privado | Requiere sesión, comprobada en el servidor |
| `/api/health` | Estado del servicio (JSON) | Abierta |

## Demostración

Hay una cuenta con datos ficticios para recorrer el producto sin tocar los
datos reales del negocio.

| | |
|---|---|
| **Usuario** | `demo@jsanchez.site` |
| **Contraseña** | Se entrega por el formulario de la plataforma del curso |

📋 **[Recorrido guiado en 4 pasos](docs/recorrido-demo.md)** — qué mirar en cada
pantalla y qué decisión de ingeniería demuestra.

> La contraseña no se publica aquí: este repositorio es público y escribirla
> daría acceso a la demostración a cualquiera.

## Arquitectura

```
src/
├── domain/     Reglas de negocio. JavaScript puro: sin DOM, sin red.
│               Es la única capa con pruebas exhaustivas.
├── auth/       Sesión con Supabase Auth.
├── data/       Cliente de Supabase.
└── ui/         Presentación.
```

La regla que sostiene el diseño: **`domain/` no importa nada de las otras
capas ni del navegador**. Por eso se prueba sin simular un DOM y por eso la
cobertura de esa capa es real y no está inflada con pruebas artificiales.

La arquitectura está documentada en [docs/arquitectura.md](docs/arquitectura.md),
con los tres niveles del modelo C4 en diagramas Mermaid.

Las decisiones importantes se registran en [docs/adr/](docs/adr/).

## Configuración

**Ninguna credencial se versiona.** El repositorio no contiene valores de
configuración de ningún tipo: los archivos que podrían llevarlos están en
`.gitignore`.

Para poner en marcha un entorno, copia `env.ejemplo` como `.env` —ignorado por
Git— y rellénalo con los datos de tu proyecto de Supabase.

📄 **[docs/configuracion.md](docs/configuracion.md)** explica qué valores hacen
falta, de dónde se obtienen, cuáles son públicos por diseño y cuáles no pueden
salir nunca del servidor.

## Cobertura

Las 166 pruebas cubren la capa de dominio y la caché local. La cobertura global
es menor porque incluye las capas de UI y de acceso a datos, que no tienen
pruebas unitarias; se reporta así a propósito, en vez de excluirlas para inflar
el número.

## Despliegue

Se publica en Vercel desde la rama `main`, protegida por un ruleset que exige
pull request y pipeline en verde antes de fusionar.

El esquema de la base vive en [`supabase/migrations/`](supabase/migrations/) y
todas las migraciones son idempotentes.

| Ajuste | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

## Licencia

ISC

## Código de verificación del curso

`LEARN-CAP-26A0B552`

Acredita que este repositorio pertenece al autor del proyecto.