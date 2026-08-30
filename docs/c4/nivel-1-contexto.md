# C4 · Nivel 1 — Contexto del sistema

Quién usa April Collections y con qué sistemas externos se relaciona.

```mermaid
graph TB
    subgraph externos[" "]
        google["<b>Google Identity</b><br/><i>Sistema externo</i><br/><br/>Verifica la identidad<br/>de quien inicia sesión"]
        supabase["<b>Supabase</b><br/><i>Sistema externo · PLANIFICADO</i><br/><br/>Autenticación y base<br/>de datos del negocio"]
        vercel["<b>Vercel</b><br/><i>Sistema externo</i><br/><br/>Publica el sitio y<br/>sirve el dominio"]
    end

    usuaria["<b>Daysi Rosario Gomez</b><br/><i>Persona · Dueña del negocio</i><br/><br/>Registra ventas, cobra<br/>y controla el inventario"]

    sistema["<b>April Collections</b><br/><i>Sistema</i><br/><br/>Gestiona ventas, deudas,<br/>inventario y cobros de un<br/>negocio de venta por catálogo"]

    profesor["<b>Evaluador del curso</b><br/><i>Persona</i><br/><br/>Recorre el producto<br/>con una cuenta demo"]

    usuaria -->|"Registra ventas y cobros<br/>desde el teléfono"| sistema
    profesor -.->|"Recorre la demo<br/>PLANIFICADO"| sistema

    sistema -->|"Delega el inicio<br/>de sesión"| google
    sistema -.->|"Guarda y consulta<br/>los datos · PLANIFICADO"| supabase
    sistema -->|"Se publica en"| vercel
    supabase -.->|"Valida el token<br/>de Google"| google

    classDef persona fill:#9e3f52,stroke:#83313f,color:#fff
    classDef nucleo fill:#c8697a,stroke:#9e3f52,color:#fff
    classDef externo fill:#7a6570,stroke:#5c4c54,color:#fff
    classDef pendiente fill:#a89aa2,stroke:#7a6570,color:#fff,stroke-dasharray: 5 5

    class usuaria,profesor persona
    class sistema nucleo
    class google,vercel externo
    class supabase pendiente
    style externos fill:none,stroke:none
```

## Actores

| Actor | Qué hace | Estado |
|---|---|---|
| **Daysi Rosario Gomez** | Usuaria real. Administra el negocio desde el teléfono: registra ventas, agenda cobros y controla existencias. | Activo |
| **Evaluador del curso** | Recorre el producto con una cuenta de demostración, sin tocar datos reales del negocio. | Planificado (Etapa 10) |

## Sistemas externos

| Sistema | Para qué | Estado |
|---|---|---|
| **Google Identity** | Proveedor de identidad. La aplicación no almacena ni valida contraseñas: no puede filtrar lo que no guarda. Ver [ADR-0001](../adr/0001-autenticacion-con-google-via-supabase.md). | Implementado, pendiente de configurar |
| **Supabase** | Base de datos del negocio y emisor del token que consumen las políticas RLS. | Planificado (Etapa 3) |
| **Vercel** | Publica el sitio y sirve el dominio propio. | Implementado |

## Lo que este nivel deja claro

**El sistema no guarda contraseñas.** La identidad la garantiza Google; April
Collections solo recibe un token ya verificado.

**Hoy los datos no salen del navegador.** Mientras Supabase no esté conectado,
todo vive en `localStorage` del dispositivo. Es la limitación que motiva la
Etapa 3 y la razón por la que el negocio todavía no puede usarse desde dos
teléfonos.
