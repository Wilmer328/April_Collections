# Registros de Decisiones de Arquitectura (ADR)

Cada archivo documenta **una** decisión de arquitectura: por que se tomo, que
alternativas se descartaron y que consecuencias trae. Se escriben en el momento
en que la decision se toma, no al final del proyecto.

Formato del nombre: `NNNN-titulo-en-kebab-case.md`

| ADR | Decision | Estado |
|-----|----------|--------|
| [0001](0001-autenticacion-con-google-via-supabase.md) | Autenticacion con Google mediante Supabase Auth | Aceptada |
| [0002](0002-estrategia-de-notificaciones.md) | Estrategia de notificaciones de cobro | Aceptada |
| [0003](0003-acceso-demo-con-credenciales-propias.md) | Acceso demo con credenciales propias (modifica ADR-0001) | Aceptada |

## Pendientes

Se documentaran en la etapa donde se tome cada decision:

- Arquitectura general por capas y herramienta de build
- Supabase como backend y modelo de datos
- Estrategia PWA y frontera del modo offline
- Estrategia de testing y meta de cobertura
- Despliegue en Vercel y cabeceras de seguridad
