# PLAN — Bot de WhatsApp para el módulo general (Mini-ERP Técnicos)

> Documento de planificación (2026-11-06). **No se escribe código hasta aprobación por fase.**
> Va DESPUÉS de lo ya aprobado en el chat de GAELA (crear contactos, botón con enlace, catálogo, anuncios).
> **Solo el módulo general.** Virginia queda fuera por ahora.
> **Todo se hace en local** (rama aparte) y se sube con pull request cuando esté probado.

---

## 0. La idea

Se reenvían al bot los mensajes de trabajos del grupo de WhatsApp. El bot los lee con la IA que ya existe
(`parse_ticket`), los organiza por técnico y semana, pregunta solo lo que no entendió, y el panel queda para
**corregir y validar**. Todo se maneja por el chat.

**Lo que hace la app hoy es intencional:** las reglas de cálculo no se cambian, se trasladan tal cual.

---

## 1. Dónde vive: un puerto en el chat de GAELA

- El chat multiempresa (`sistema-inventario`) recibe el mensaje como siempre (webhook, cola, contacto, panel).
- **Un solo punto de desvío** después de guardar el mensaje (`bot_service.py`, `procesar_mensaje_entrante`):
  si el negocio tiene encendida la integración «Técnicos (MINI ERP)», el mensaje va al **puerto**, no al bot de ventas.
- Todo lo de técnicos vive en **su propia carpeta** (el adaptador): tandas, preguntas, comandos y llamadas a MINI_ERP.
  Si se apaga la integración, el resto del chat no cambia.
- **MINI_ERP sigue siendo dueño** de los datos, el cálculo y el Excel; el chat le habla por API.
- Condiciones: **número de WhatsApp propio y empresa propia** en el chat. Nunca el número de GAELA.

Descartados: Telegram (los técnicos usan WhatsApp), WhatsApp Web no oficial (riesgo de bloqueo del número),
grupos de la API de Meta (piden cuenta oficial verificada y máximo 8 personas).

---

## 2. Cálculo: el panel calcula al instante, el servidor manda (decidido con el dueño 2026-11-06)

**Hoy:** el total lo calcula el navegador (`FrontEnd/src/Utils/api.js → procesarData`) para que todo sea
instantáneo, y el servidor guarda lo que le mandan (`controllers.py → envioRegistrosDB`) sin revisarlo.

**Cómo queda (la práctica estándar: interfaz instantánea + servidor que manda):**
1. **El panel NO cambia lo que se siente:** sigue calculando en el navegador al editar una celda, pegar (Ctrl+V),
   arrastrar, borrar, deshacer, agregar por formulario o por mensaje, y en la vista de celular. Instantáneo.
2. **El servidor recalcula al guardar con la MISMA fórmula y su total es el que vale.** Si coincide con el del panel
   (lo normal), no se nota; si no, gana el del servidor y el panel se corrige con lo que le devuelve.
3. **Se guarda todo lo que la fórmula usa** (`is_cash`, `aplica_dolar_empresa`, `adicional_dolar`, y lo del contrato
   con que se calculó), para que un trabajo viejo dé siempre el mismo total al editarlo.
4. **Las dos fórmulas nunca se separan:** se generan cientos de casos con la fórmula del panel (todas las ramas:
   CASH con y sin «to tech», ≤ mínimo+25, sobre y bajo el mínimo; CC igual; CC como cash; MIXTO) y una prueba exige
   que la del servidor dé EXACTAMENTE lo mismo. Si un día se cambia la del panel, la prueba avisa.
5. **Validación con lo guardado:** recalcular, solo leyendo, todos los registros y compararlos con su `total`. Cada
   diferencia se revisa con el dueño (puede ser una corrección a mano) antes de que el servidor empiece a mandar.
6. **El bot, los resúmenes y el Excel por enlace usan el cálculo del servidor** (un solo dueño de los números).

**La sinergia panel ↔ servidor (cómo se ve):**
- Se edita → el panel calcula y muestra AL INSTANTE → guarda en segundo plano (como hoy, juntando cambios) → el
  servidor recalcula y devuelve la fila completa → el panel la compara: si es igual, solo queda «guardada»; si es
  distinta, reemplaza el número YA, resalta la celda un par de segundos y avisa «El total de DCBAV se ajustó: $120 →
  $118». Nadie trabaja con un número que no es el guardado.
- Si guardar falla (internet), la fila queda «sin guardar» y se reintenta sola.
- Cada diferencia panel ≠ servidor se ANOTA con sus datos: es un error de una de las dos fórmulas y ese caso pasa a
  ser una prueba nueva.
- Lo que crea el bot con el panel abierto: el panel pregunta cada pocos segundos (solo mientras está abierto) y avisa
  «Llegaron 5 trabajos nuevos por WhatsApp · Ver»; no mueve la tabla mientras se edita.

**Reglas que se trasladan tal cual** (confirmadas como intencionales el 2026-11-06):
- `valorReal = servicio − partes_técnico − partes_gil`; adicional = `adicional_dolar` del contrato, o el de
  empresa si `aplica_dolar_empresa = SI` (ese campo son dólares aunque se llame porcentaje).
- Total positivo = el técnico le debe a Gil; negativo = Gil le debe al técnico.
- El umbral `mínimo + 25` sobre el servicio bruto; MIXTO no aplica el mínimo.
- La comisión CC = base × %CC (base: servicio en CC, tarjeta en MIXTO). Hoy se calcula al pintar la celda;
  el bot la calcula él.
- **Sábados:** no se aplican solos. Si el técnico tiene `cargo_sabados`, la app solo muestra la nota y la
  persona cambia el `% técnico` a mano. El bot hace lo mismo: avisa, no aplica.

**Puntos a cuidar (sin cambiar reglas):**
- Los registros no guardan `is_cash`, `aplica_dolar_empresa` ni `adicional_dolar`; al editar uno viejo se
  recalcula con el contrato de hoy. El bot debe guardar con qué se calculó (ver §6).
- Etiqueta de semana: el panel usa `semana_07` y el servidor `semana_7` (semanas 1–9). El bot usa la del servidor.
- «Hoy» del servidor es su zona horaria, no la de EE. UU.: el bot nunca asume la semana, la pregunta (§4).

---

## 3. Seguridad (antes de conectar nada)

El ERP no tiene inicio de sesión y acepta llamadas de cualquier origen (`origins = ["*"]` en `main.py`), y está
publicado en Vercel. Antes del bot:
- Inicio de sesión en el panel.
- CORS solo al dominio del panel.
- Llave de API para el chat (la integración), distinta de la sesión de las personas.
- Enlaces de Excel firmados y con vencimiento (no adivinables).

---

## 4. La semana, siempre con fechas

- Al empezar una tanda: botones **[2 – 8 nov] [26 oct – 1 nov] [Otra]**; «Otra» = lista de las últimas 8
  (`semanas_recientes`). También vale escribir «semana 44» o una fecha, y el bot confirma el rango.
- La tanda se queda en esa semana hasta cambiarla o tras 30 min sin mensajes.
- Si el mensaje trae fecha (el lector ya la extrae) y no cae en la semana elegida → alerta.

---

## 5. El técnico: por tanda (B) y por nombre en el mensaje (C)

- Un mensaje que es solo un nombre («AFIK») marca la tanda: lo siguiente es de ese técnico.
- Si el mensaje trae nombre arriba (`Afik ***`), gana ese nombre.
- Coincidencia exacta o casi exacta contra los técnicos; **sin aprender apodos** (podría llegar alguien que se
  llame así). Si duda entre pocos: botones con los posibles. Si no: campo del formulario. Si tampoco: cajón
  «Sin técnico» en el panel.

---

## 6. Flujo de una tanda

1. Se elige semana y se reenvían los mensajes (pueden ser 30 o más). El bot espera a que termine la tanda.
2. **Un solo resumen:** «Recibí 30. 28 listos (Afik 10, Nick 8…). 2 por completar. 1 para revisar.»
3. **Formulario (WhatsApp Flow)** con solo lo que falta de cada trabajo dudoso; lo entendido ya viene puesto.
4. **Corregir desde el chat:** se responde citando el mensaje del trabajo («son 300 cash»); el chat ya recibe
   qué mensaje se citó (`reply_to_wamid`); la IA cambia solo ese trabajo y el bot confirma con
   **[Bien] [Deshacer]**.
5. Todo queda **por validar** en el panel hasta que se aprueba.

---

## 7. Alertas

**🔴 No se puede calcular** (no entra hasta corregir): sin técnico o técnico inexistente; el técnico no tiene
contrato para ese tipo de job; sin valor del servicio (`Price: N/A` y sin monto); MIXTO sin el reparto; job
repetido (ya existe `validarJobDuplicado`); la parte del técnico da 0 o menos (la fórmula no calcula y dejaría el
total en 0).

**🟡 Revisar** (entra marcado): bajo el mínimo; partes o «to tech» mayores que el servicio; valor muy fuera de
lo normal del técnico; posible sábado (nota del cargo); fecha del mensaje fuera de la semana; semana cerrada.

**Cómo llegan:** en el resumen de la tanda; las 🔴 dentro del formulario; las 🟡 con botón [Ver]; en el panel
una marca por trabajo y el filtro «Con alertas»; «cerrar semana» no cierra con 🔴 pendientes.

---

## 8. Comandos (primera tanda; se agregan más si los piden)

`menú` · elegir semana · `NOMBRE` (marca la tanda) · `resumen` · `excel afik` · `excel todos` · `pendientes` ·
`buscar DCBAV` · `borrar DCBAV` (pide confirmar) · `nota afik …` · `deshacer` (última tanda) · `cerrar semana`
(manual, cualquier día).

---

## 9. Historial para mejorar la IA

Tabla nueva en el ERP, una fila por mensaje: texto original, quién y cuándo lo mandó, salida de la IA, modelo y
versión del prompt, **datos finales validados**, campos corregidos, y **tokens y costo de la llamada**.
Sirve para medir el acierto por campo, dar ejemplos reales a la IA y probar cambios de prompt sin empeorar.
Los mensajes traen datos de clientes (nombre, teléfono, dirección): definir cuánto tiempo se guardan.

---

## 10. Última fase: la app de GAELA como integración (con maquetas para validar)

Con la integración «Técnicos (MINI ERP)» activa se oculta todo lo de e-commerce (ventas, checkout, recuperación,
impulsador, tienda, productos, combos, suscripciones, B2B, Dropi y sus métricas). Se queda: chat, plantillas de
Meta, equipo, cuenta, marca, perfil de WhatsApp, integraciones, métricas de atención y gasto de WhatsApp.

Se agrega:
- **Semana:** una tarjeta por técnico (trabajos, ventas, saldo con Gil), pendientes, alertas, cerrar semana y
  enlaces de Excel.
- **Por validar:** la bandeja con alertas, «Aprobar todo» y corrección rápida.
- **Métricas de técnicos:** por semana y técnico, por tipo de job, cash contra CC, promedio, partes y tendencia.
- **Gasto de IA** del bot (sale del historial, §9).
- **Botón «Abrir el ERP»**: la configuración de técnicos y la edición fina se quedan en el ERP, sin duplicar.

---

## Fases (cada una se aprueba antes de empezar)

**Estado 2026-11-06:** 1 ✅ · 2 ✅ · 3 ✅ · 4 ✅ · 5 ✅ · 6 ✅ (el formulario de WhatsApp queda apagado hasta publicar
el Flow en Meta; corregir citando ya funciona) · 7 ✅ (maqueta aprobada; construida en la app de GAELA, en local) Todo en local; lo que falta
para publicar está en GAELA `docs/decisiones/D-300-399.md` → D-338. Pruebas: `BackEnd/tests` (89, pytest, SQLite),
`FrontEnd/npm test` (8), chat de GAELA (303) y el contrato real chat↔ERP (`BackEnd/tests/contrato/erp_de_prueba.py`).
Hallazgo de la fase 2: hay ramas de la fórmula que **dejan el total como viene** (cuando la parte del técnico da
0 o menos: % técnico 0, o partes ≥ servicio). El panel arrastra el total anterior; el servidor ahora parte del
total que manda el panel. Para el bot (que no trae total) eso es una 🔴 «no se puede calcular» (§7).

Todo en local (rama aparte), probado, y se sube con pull request. El ERP está en producción (Vercel): nada se
publica sin decirlo.

1. **Seguridad del ERP (§3).** Inicio de sesión en el panel, CORS solo para el panel, llave de API para el chat,
   enlaces de Excel firmados y con vencimiento.
2. **El cálculo con el servidor mandando (§2).** La fórmula en Python idéntica a la del panel + los casos de prueba
   generados desde el panel + guardar los datos que faltan + revisar con el dueño las diferencias contra lo guardado.
   El panel sigue instantáneo; al guardar, el servidor confirma.
3. **Endpoints para el bot.** Crear trabajos «por validar» (con el total del servidor), buscar y borrar por job,
   resumen por técnico y semana, Excel por enlace, y el historial de mensajes para mejorar la IA (§9).
4. **El puerto en el chat de GAELA (§1).** Tandas, la semana con fechas (§4), el técnico por tanda o por nombre (§5),
   el resumen de cada tanda (§6) y los comandos (§8). Con su propio número de WhatsApp.
5. **Alertas (§7).** Las 🔴 que no dejan entrar y las 🟡 que entran marcadas, en el resumen y en el panel.
6. **El formulario de WhatsApp (Flow) y corregir desde el chat (§6).**
7. **Los paneles en la app de GAELA (§10),** primero con maquetas para validar.
