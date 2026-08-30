# Arquitectura — Modelo C4

Diagramas del sistema en tres niveles de zoom, según el modelo C4 de Simon
Brown. Están escritos en Mermaid, así que GitHub los dibuja directamente y se
versionan como texto: un cambio de arquitectura se revisa en un diff, no
comparando capturas de pantalla.

| Nivel | Pregunta que responde | Diagrama |
|-------|----------------------|----------|
| 1 · Contexto | ¿Quién usa el sistema y con qué se habla? | [nivel-1-contexto.md](nivel-1-contexto.md) |
| 2 · Contenedores | ¿De qué piezas ejecutables se compone? | [nivel-2-contenedores.md](nivel-2-contenedores.md) |
| 3 · Componentes | ¿Cómo está organizado el código por dentro? | [nivel-3-componentes.md](nivel-3-componentes.md) |

## Cómo leer el estado de cada elemento

Los diagramas distinguen lo que ya existe de lo que está planificado. Eso es
deliberado: un diagrama que muestra la arquitectura soñada como si estuviera
construida no sirve para tomar decisiones.

| Marca | Significado |
|-------|-------------|
| **Implementado** | Funciona hoy y está en el repositorio |
| **Planificado** | Decidido y documentado en un ADR, todavía sin construir |

## Decisiones relacionadas

- [ADR-0001](../adr/0001-autenticacion-con-google-via-supabase.md) — Autenticación con Google
- [ADR-0002](../adr/0002-estrategia-de-notificaciones.md) — Estrategia de notificaciones
