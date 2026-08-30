# C4 · Nivel 2 — Contenedores

Las piezas ejecutables que componen April Collections y cómo se comunican.

```mermaid
graph TB
    usuaria["<b>Daysi Rosario Gomez</b><br/><i>Persona</i>"]

    subgraph navegador["Navegador de la usuaria"]
        spa["<b>Aplicación web</b><br/><i>HTML · CSS · JavaScript ES</i><br/><br/>Las seis pantallas del negocio.<br/>Compilada con Vite"]
        sw["<b>Service Worker</b><br/><i>JavaScript</i><br/><br/>Cachea la aplicación para<br/>que abra sin conexión"]
        almacen["<b>localStorage</b><br/><i>Almacén del navegador</i><br/><br/>Datos del negocio.<br/>PROVISIONAL"]
    end

    subgraph plataforma["Vercel"]
        cdn["<b>Sitio estático</b><br/><i>CDN</i><br/><br/>Sirve landing, login y<br/>aplicación desde dist/"]
        fn["<b>Función serverless</b><br/><i>Node · PLANIFICADO</i><br/><br/>Restablece los datos<br/>de la cuenta demo"]
    end

    subgraph backend["Supabase · PLANIFICADO"]
        auth["<b>Auth</b><br/><br/>Sesión y emisión<br/>del token JWT"]
        db["<b>PostgreSQL</b><br/><br/>Datos del negocio,<br/>protegidos con RLS"]
    end

    google["<b>Google Identity</b><br/><i>Sistema externo</i>"]

    usuaria -->|"HTTPS"| spa
    spa -->|"Lee y escribe<br/>PROVISIONAL"| almacen
    spa -->|"Registra"| sw
    sw -->|"Sirve desde caché<br/>cuando no hay red"| spa
    cdn -->|"Entrega"| spa

    spa -.->|"Inicia sesión<br/>PLANIFICADO"| auth
    spa -.->|"Consulta y guarda<br/>PLANIFICADO"| db
    auth -.->|"Delega en"| google
    auth -.->|"Emite el JWT que<br/>evalúan las políticas"| db
    fn -.->|"service_role<br/>PLANIFICADO"| db

    classDef persona fill:#9e3f52,stroke:#83313f,color:#fff
    classDef contenedor fill:#c8697a,stroke:#9e3f52,color:#fff
    classDef externo fill:#7a6570,stroke:#5c4c54,color:#fff
    classDef pendiente fill:#a89aa2,stroke:#7a6570,color:#fff,stroke-dasharray: 5 5

    class usuaria persona
    class spa,sw,cdn contenedor
    class google externo
    class almacen,fn,auth,db pendiente
```

## Contenedores

| Contenedor | Tecnología | Responsabilidad | Estado |
|---|---|---|---|
| **Aplicación web** | HTML, CSS y módulos ES compilados con Vite | Las seis pantallas del negocio y toda la lógica de dominio | Implementado |
| **Service Worker** | JavaScript propio | Cachear el envoltorio para que la aplicación abra sin conexión | Implementado (Etapa 6) |
| **localStorage** | Almacén del navegador | Guardar los datos del negocio | **Provisional** |
| **Sitio estático** | CDN de Vercel | Servir `dist/` en el dominio propio | Implementado |
| **Función serverless** | Node en Vercel | Restablecer la cuenta demo con la `service_role` key, que no puede viajar al navegador | Planificado (Etapa 10) |
| **Supabase Auth** | Servicio gestionado | Sesión y emisión del JWT | Planificado (Etapa 4) |
| **PostgreSQL** | Servicio gestionado | Datos del negocio con políticas RLS por dueño | Planificado (Etapa 3) |

## Dos decisiones que este nivel explica

**No hay servidor propio de aplicación.** El frontend habla directamente con
Supabase, que evalúa las políticas RLS del lado del servidor contra el usuario
autenticado. Añadir una capa intermedia sería complejidad sin beneficio: la
autorización ya se decide donde están los datos.

**La única función serverless prevista existe por una razón concreta.**
Restablecer la cuenta demo requiere la `service_role` key, que ignora todas las
políticas RLS y por tanto no puede estar en el navegador bajo ninguna
circunstancia. Ese código tiene que ejecutarse en el servidor. No se prevén
más funciones: el CRUD no las necesita.

**`localStorage` está marcado como provisional, no como diseño.** Es lo que hay
hoy y funciona para un dispositivo, pero significa que los datos no se comparten
entre teléfonos y se pierden al limpiar el navegador. La Etapa 3 lo convierte en
caché de Supabase, no en la fuente de verdad.
