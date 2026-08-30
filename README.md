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
| Landing y login | ✅ publicados |
| Capa de dominio con pruebas | ✅ 79 pruebas, 100 % de líneas |
| Build y entorno de pruebas | ✅ Vite + Vitest |
| Autenticación con Google | ⏳ implementada, falta configurar Supabase |
| Persistencia en Supabase | ❌ hoy usa `localStorage` |
| PWA y modo offline | ❌ |
| CI y SonarCloud | ❌ |

## Cómo ejecutarlo

```bash
npm install
npm run dev          # servidor de desarrollo
npm run build        # genera dist/
npm test             # 79 pruebas
npm run test:coverage
```

Requiere Node 20 o superior.

## Rutas

| Ruta | Página |
|---|---|
| `/` | Landing pública |
| `/login` | Inicio de sesión con Google |
| `/app` | Aplicación |

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

Las decisiones importantes se registran en [docs/adr/](docs/adr/).

## Configuración

**Ninguna credencial se versiona.** El repositorio no contiene valores de
configuración de ningún tipo: los archivos que podrían llevarlos están en
`.gitignore`.

Para poner en marcha un entorno, copia `config.example.js` como `config.js`
—ignorado por Git— y rellénalo con los datos de tu proyecto de Supabase.

📄 **[docs/configuracion.md](docs/configuracion.md)** explica qué valores hacen
falta, de dónde se obtienen, cuáles son públicos por diseño y cuáles no pueden
salir nunca del servidor.

## Cobertura

La capa de dominio está al 100 % de líneas y funciones. La cobertura global es
menor porque incluye las capas de UI y autenticación, que todavía no tienen
pruebas; se reporta así a propósito, en vez de excluirlas para inflar el número.

## Despliegue

Se publica en Vercel desde la rama `main`.

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