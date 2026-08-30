# C4 · Nivel 3 — Componentes de la aplicación web

Cómo está organizado el código dentro del contenedor «Aplicación web».

```mermaid
graph TB
    subgraph ui["ui · Presentación"]
        pantallas["<b>Pantallas</b><br/><br/>Inicio, Venta, Clientes,<br/>Inventario, Precios,<br/>Recordatorios"]
        animaciones["<b>Animaciones</b><br/><br/>Aparición al desplazar<br/>de la landing"]
    end

    subgraph dominio["domain · Reglas de negocio"]
        money["<b>money</b><br/>Dinero en centavos"]
        dates["<b>dates</b><br/>Fechas de calendario local"]
        pricing["<b>pricing</b><br/>Precio y margen"]
        sales["<b>sales</b><br/>Totales y saldos"]
        inventory["<b>inventory</b><br/>Existencias"]
        reminders["<b>reminders</b><br/>Estados de cobro"]
        notifications["<b>notifications</b><br/>Cuándo avisar"]
        customers["<b>customers</b><br/>Identidad y duplicados"]
        categories["<b>categories</b><br/>Rubros del catálogo"]
        search["<b>search</b><br/>Comparación de texto"]
    end

    subgraph datos["data · Acceso a datos"]
        cliente["<b>supabaseClient</b><br/>PLANIFICADO"]
        local["<b>localStorage</b><br/>PROVISIONAL"]
    end

    subgraph sesion["auth · Sesión"]
        session["<b>session</b><br/><br/>Iniciar, leer y<br/>cerrar sesión"]
    end

    pantallas --> money
    pantallas --> dates
    pantallas --> pricing
    pantallas --> sales
    pantallas --> inventory
    pantallas --> reminders
    pantallas --> notifications
    pantallas --> customers
    pantallas --> categories
    pantallas --> local
    pantallas -.-> cliente

    notifications --> dates
    notifications --> reminders
    reminders --> dates
    sales --> money
    pricing --> money
    customers --> search
    categories --> search

    session -.-> cliente

    classDef capaUi fill:#c9a96e,stroke:#a8873f,color:#2a2024
    classDef capaDominio fill:#4a9e7a,stroke:#37755a,color:#fff
    classDef capaDatos fill:#7a6570,stroke:#5c4c54,color:#fff
    classDef pendiente fill:#a89aa2,stroke:#7a6570,color:#fff,stroke-dasharray: 5 5

    class pantallas,animaciones capaUi
    class money,dates,pricing,sales,inventory,reminders,notifications,customers,categories,search capaDominio
    class local,session capaDatos
    class cliente pendiente
```

## La regla que sostiene el diseño

**`domain/` no importa nada de `ui/`, de `data/` ni del navegador.** Las flechas
del diagrama solo entran al dominio; ninguna sale hacia arriba.

Esa restricción no es estética. Tiene tres consecuencias medibles:

1. **Se prueba sin simular un navegador.** Las pruebas corren en Node, sin DOM
   ni mocks. Por eso la capa está al 100 % de líneas y funciones con pruebas
   que verifican reglas reales, no cobertura inflada.
2. **Las reglas están en un solo sitio.** Antes, el cálculo del saldo pendiente
   aparecía repetido en siete lugares de `app.html`, cada uno con su propia
   tolerancia de céntimos.
3. **Cambiar de almacenamiento no toca las reglas.** Al migrar de
   `localStorage` a Supabase, `domain/` no se modifica.

## Componentes del dominio

| Módulo | Responsabilidad | Decisión que fija |
|---|---|---|
| `money` | Dinero en centavos enteros | Elimina el error de coma flotante y la tolerancia de `0.01` repetida ocho veces |
| `dates` | Fechas de calendario local | Corrige dos errores de zona horaria: ventas del día 1 contadas en el mes anterior, y el día cambiando a las 18:00 |
| `pricing` | Precio desde margen y su inversa | El margen no puede ser negativo |
| `sales` | Total, saldo, ganancia, forma de pago | El saldo nunca es negativo; la ganancia se reconoce al vender, no al cobrar |
| `inventory` | Existencias y movimientos | Vender exige stock suficiente; el ajuste manual sí recorta en cero |
| `reminders` | Estados y vencimiento | Al saldarse una venta, sus recordatorios se cierran solos |
| `notifications` | Cuándo avisar de un cobro | Avisa 30 min antes e insiste hasta que la usuaria lo atiende |
| `customers` | Identidad y duplicados | DNI opcional, pero validado y único cuando se escribe |
| `categories` | Rubros del catálogo | No admite repetidos ignorando tildes; no se borra una categoría en uso |
| `search` | Comparación de texto | Ignora mayúsculas y tildes: se teclea con prisa desde el teléfono |

## Deuda declarada

`app.html` todavía usa atributos `onclick` en el HTML. Como su script es un
módulo y no comparte el ámbito global, hay un bloque `Object.assign(window, …)`
que expone las funciones que el HTML invoca, y una prueba
([tests/app-handlers.test.js](../../tests/app-handlers.test.js)) que falla si
ambas listas se separan.

Ese bloque se reduce cada vez que un control migra a `addEventListener`. Cuando
llegue a cero podrá activarse la Content-Security-Policy estricta, que prohíbe
el código en línea.
