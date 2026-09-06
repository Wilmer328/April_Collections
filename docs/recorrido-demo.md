# Recorrido guiado de la demostración

Cuatro pasos para ver April Collections funcionando. Cada uno enseña una
decisión de ingeniería, no solo una pantalla.

**Duración estimada:** 6 minutos.

Cada paso tiene su propia dirección: las pestañas de la aplicación son
enlazables con `#`, así que se puede saltar directamente a la pantalla que toca
en lugar de explicar dónde hacer clic.

## Acceso

| | |
|---|---|
| **Sitio** | https://www.jsanchez.site |
| **Usuario demo** | `demo@jsanchez.site` |
| **Contraseña** | Se entrega por el formulario de la plataforma del curso |

> La contraseña no se publica en este repositorio ni en el sitio: es un
> repositorio público y escribirla aquí daría acceso a la demostración a
> cualquiera.

Los datos de esta cuenta son **inventados**. Los del negocio real están en otra
cuenta y las políticas RLS impiden verlos desde aquí — precisamente lo que el
paso 1 demuestra.

Para dejar la demostración como estaba después de trastearla, basta volver a
ejecutar `supabase/migrations/0003_datos_demo.sql`: es idempotente.

---

## Paso 1 · Iniciar sesión

**URL:** https://www.jsanchez.site/login

Entra con el correo y la contraseña de la cuenta demo.

**Qué observar**

- Hay **dos formas de entrar**: Google, que es la que usa la dueña del negocio,
  y correo con contraseña, que existe solo para esta demostración. El porqué
  está en [ADR-0003](adr/0003-acceso-demo-con-credenciales-propias.md).
- Prueba a entrar con **cualquier otra cuenta de Google**. Será rechazada: la
  aplicación no tiene registro público, y un disparador en PostgreSQL bloquea
  el alta de correos que no estén autorizados. La comprobación está en la base
  de datos y no en el navegador, así que no se salta desactivando JavaScript.

**Qué demuestra:** autenticación real contra Supabase, y control de acceso del
lado del servidor.

---

## Paso 2 · Distinguir dos clientas con el mismo nombre

**URL:** https://www.jsanchez.site/app#clientes

Escribe `maria` en el buscador.

**Qué observar**

- Aparecen **dos clientas llamadas María Fernanda López**, con DNI distinto.
  Es el problema real que motivó añadir el documento: sin él no hay forma de
  saber a cuál se le carga una deuda.
- El buscador ignora tildes y mayúsculas: `maria` encuentra `María`. La dueña
  teclea con prisa desde el móvil.
- El **DNI es opcional**. *Ana Gabriela Munguía* y *Doris Elena Zelaya* no lo
  tienen: se registran en medio de una venta, sin el documento a la vista.
  Cuando sí se escribe, se valida que sean 13 dígitos y que no esté repetido.

**Qué demuestra:** una regla de negocio nacida de un problema real, resuelta sin
estorbar el uso diario. La lógica vive en `src/domain/customers.js` y está
cubierta por pruebas.

---

## Paso 3 · Registrar una venta

**URL:** https://www.jsanchez.site/app#venta

Elige una clienta, escribe `perfume` en el buscador de productos y selecciona
uno.

**Qué observar**

- El **precio se rellena solo y queda bloqueado**, con fondo dorado. Viene de
  Inventario. Si se pudiera escribir a mano, dos ventas del mismo artículo
  podrían quedar con precios distintos y el margen del mes saldría mal.
- Busca `pulsera`. Aparece **✕ Pulsera de acero — Sin stock**, atenuada y no
  seleccionable. No se vende lo que no hay.
- El producto **«✏️ Otro producto»** sí permite escribir el precio: es para lo
  que no está en el catálogo. Ahí, y solo ahí, tiene sentido.
- Elige **«Con abono inicial»** y observa cómo el total y el pendiente se
  recalculan al escribir.

**Qué demuestra:** el inventario manda sobre el precio, y las reglas de dinero
viven en un solo sitio. Los importes se guardan en **centavos enteros**, no en
decimales: con decimales, un total repartido en abonos parciales acumula error y
una deuda saldada queda con fracciones pendientes.

---

## Paso 4 · Cobros y avisos

**URL:** https://www.jsanchez.site/app#recordatorios

**Qué observar**

- **Karla Yamileth Cruz** tiene una venta de L 1,700 con dos abonos: debe
  L 700. En **🏠 Inicio** aparece en «Por cobrar».
- Hay un recordatorio **vencido** de Doris Elena Zelaya, uno **para hoy**, uno
  **futuro**, uno **completado** y uno **descartado**: los cinco estados.
- Pulsa **«🔔 Activar avisos en este dispositivo»** y acepta el permiso. El
  aviso salta **30 minutos antes** de la hora prometida y **insiste cada 10
  minutos** hasta que se atiende. La versión anterior lo daba por emitido al
  mostrarlo, así que si la aplicación estaba cerrada en ese minuto exacto, el
  aviso se perdía para siempre.
- Abre el detalle de la venta de Karla y **registra un abono** que cubra los
  L 700. Al saldarse, su recordatorio pasa solo a *Pagado*.

**Qué demuestra:** la regla que da valor al producto — al cobrar, la deuda y el
recordatorio se actualizan solos, sin que nadie tenga que acordarse.

**Frontera declarada:** estos avisos llegan con la aplicación abierta, aunque
esté en segundo plano. Con la aplicación **cerrada** hacen falta Web Push y un
servidor que dispare el envío; está documentado en
[ADR-0002](adr/0002-estrategia-de-notificaciones.md) como trabajo pendiente. Es
una restricción del modelo de seguridad de la web, no una carencia de la
implementación.

---

## Extra · Instalación y modo sin conexión

**URL:** https://www.jsanchez.site/app

- Pulsa **«⬇️ Instalar»** en la cabecera. La aplicación se instala como
  aplicación del sistema, sin pasar por ninguna tienda.
- Con ella abierta, **desconecta la red**. Aparece un aviso al pie y la
  aplicación sigue abriendo y mostrando lo ya cargado.

| ✅ Funciona sin conexión | ❌ No puede funcionar sin conexión |
|---|---|
| Abrir la aplicación instalada | Iniciar sesión |
| Consultar lo ya cargado | Guardar cambios nuevos |
| Calculadora de precios | Ver datos de otro dispositivo |

---

## Portal privado

**URL:** https://www.jsanchez.site/panel

Muestra la cuenta con la que se entró y el estado del servicio.

Ábrela en una **ventana de incógnito**, sin sesión: responde **302** al inicio
de sesión, sin enviar el documento. La comprobación ocurre en el servidor,
antes de servir nada.

---

## Comprobación del servicio

**URL:** https://www.jsanchez.site/api/health

Devuelve JSON con el estado, el entorno y el commit desplegado. Es una función
serverless y no un archivo fijo: un JSON estático diría «ok» aunque el
despliegue estuviera roto.
