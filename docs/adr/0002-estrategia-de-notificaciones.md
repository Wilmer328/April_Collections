# ADR-0002 — Estrategia de notificaciones de cobro

- **Estado:** Aceptada
- **Fecha:** 2026-08-30
- **Decide:** Wilmer Sánchez

## Contexto

Los recordatorios de cobro son la funcionalidad que más valor da a la
aplicación: la clienta prometió pagar el viernes, y si nadie le escribe, el
viernes pasa. Un recordatorio que no avisa no sirve de nada.

La implementación original tenía tres defectos que la volvían poco fiable:

1. **Avisaba a la hora exacta.** Enterarse a las 7:00 de que había que cobrar a
   las 7:00 no deja margen para nada.
2. **Exigía coincidencia de minuto exacto** (`recordatorio.hora !== horaActual`).
   Si la aplicación no estaba abierta justo en ese minuto, el aviso no se
   producía nunca.
3. **Marcaba el aviso como emitido al mostrarlo** y lo guardaba. Tras recargar
   la página, ese recordatorio ya no volvía a avisar aunque nadie lo hubiera
   visto.

El cliente pidió además que el aviso llegue al teléfono o computadora, no solo
dentro de la aplicación, y que permanezca hasta que lo vea.

## Decisión

Implementar los avisos en **dos etapas separadas por su dependencia técnica**.

### Etapa actual — Notifications API

Se usa la API de notificaciones del navegador, sin servidor:

- El aviso se calcula **30 minutos antes** de la hora prometida
  (`MINUTOS_ANTICIPACION`).
- **Insiste cada 10 minutos** (`MINUTOS_ENTRE_INSISTENCIAS`) hasta que la
  usuaria lo atiende, en lugar de darse por emitido al mostrarse.
- Se marca con `requireInteraction: true`, de modo que permanece en pantalla en
  vez de desvanecerse sola a los pocos segundos.
- Se agrupa con `tag: 'cobro-<id>'`, así al insistir se reemplaza el aviso
  anterior del mismo cobro en lugar de apilar copias.
- Un aviso cuyo momento ya pasó **sigue pendiente**: al abrir la aplicación al
  día siguiente, aparece.

Toda la lógica de *cuándo* avisar vive en `src/domain/notifications.js`, sin
DOM ni navegador, y está cubierta por 24 pruebas. La interfaz solo decide
*cómo* mostrarlo.

### Etapa 6 — Web Push

Notificar con la aplicación **cerrada** requiere Service Worker, Push API con
claves VAPID, y un servidor que dispare el envío a la hora programada. Se
pospone a la Etapa 6, cuando exista backend en Supabase.

## Frontera, y por qué importa declararla

Esta es la limitación que hay que poder explicar y no disimular:

| Situación | ¿Llega el aviso? |
|---|---|
| Aplicación abierta y visible | ✅ Sí |
| Aplicación abierta en otra pestaña o minimizada | ✅ Sí |
| Aplicación cerrada, navegador abierto | ⚠️ Depende del navegador |
| Aplicación y navegador cerrados, teléfono bloqueado | ❌ No, hasta la Etapa 6 |

Motivo técnico: sin Service Worker no hay código propio ejecutándose cuando la
página no está cargada. Ninguna cantidad de JavaScript en la página resuelve
eso; es una restricción del modelo de seguridad de la web, no una carencia de
la implementación.

En iOS, además, las notificaciones push exigen que la aplicación esté instalada
en la pantalla de inicio como PWA.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **SMS o WhatsApp** | Resolvería el caso de aplicación cerrada de forma inmediata, pero tiene costo por mensaje y ata el proyecto a un proveedor externo con credenciales de pago. Desproporcionado para un negocio de esta escala. |
| **Correo electrónico** | Gratuito y funciona con la aplicación cerrada, pero la usuaria no revisa el correo durante la jornada de ventas: el aviso llegaría tarde. |
| **Solo avisos dentro de la aplicación** | Es lo que ya había y es justo lo que el cliente pidió mejorar. |
| **Web Push ahora mismo** | Es la solución correcta, pero necesita un servidor que programe y dispare el envío. Sin backend no se puede hacer, y montarlo antes que Supabase invertiría el orden de las etapas. |

## Consecuencias

**A favor**

- El aviso llega al sistema operativo, no solo a la pestaña, y permanece.
- Deja de perderse: mientras el cobro siga pendiente y sin atender, insiste.
- Sin costo, sin proveedor externo y sin credenciales que administrar.
- La lógica es comprobable sin navegador, así que el comportamiento está fijado
  por pruebas y no depende de ensayo y error.

**En contra**

- No cubre el caso de aplicación cerrada, que es justamente cuando más falta
  haría. Es una solución parcial declarada como tal.
- Depende de que la usuaria conceda el permiso de notificaciones. Si lo
  deniega, la pantalla lo explica y los avisos siguen apareciendo dentro de la
  aplicación.

## Verificación

- Crear un recordatorio para dentro de 31 minutos: no debe avisar todavía.
- Ajustarlo a 29 minutos: debe avisar de inmediato.
- Cerrar el aviso con "En un rato": debe reaparecer a los 10 minutos.
- Cerrarlo con la ✕: no debe volver a insistir.
- Recargar la página con un aviso pendiente sin atender: debe reaparecer.

## Referencias

- Lógica y pruebas: `src/domain/notifications.js`, `tests/domain/notifications.test.js`
- Presentación: `app.html`, sección «AVISOS DE COBRO»
- Decisión relacionada: [ADR-0001](0001-autenticacion-con-google-via-supabase.md)
