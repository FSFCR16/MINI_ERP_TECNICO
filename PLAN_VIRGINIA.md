# PLAN DE ACCIÓN — Módulo VIRGINIA (Mini-ERP Técnicos)

> Documento de planificación. **No se escribe código hasta aprobación por fase.**
> Virginia es un módulo **aditivo y 100% independiente**: no se modifica nada del flujo de técnicos generales.

---

## 0. Principios

- **Cero acoplamiento con el general.** No se tocan `models.py`, `routes.py`, `controllers.py`, `schemmas.py`, `utils.py` ni las tablas `tecnicos` / `registros_semanas` / `semanas_tecnico`.
- **Único toque a archivo existente:** un acceso a `/virginia` en el home (`page.js`) y el registro del router nuevo en `main.py`.
- **Modelo normalizado** (técnico-persona como entidad real), por si a futuro se migra el general al mismo patrón.
- Trabajo **por fases aprobables**: no se avanza de fase sin OK explícito.

---

## 1. Reglas de negocio de Virginia (confirmadas)

| # | Regla |
|---|-------|
| 1 | Parser IA **separado** para Virginia: reconoce tipo de pago para el **trato** (CASH/CC), el tipo `PVT JOBS`, y **no extrae partes**. |
| 2 | Se eliminan columnas `partes_gil`, `partes_tecnico` y `tech` en **ambas tablas** (carga y vista) y en el Excel. |
| 3 | Se elimina el **% tarjeta** (`porcentaje_cc`): el CC no descuenta % de tarjeta. |
| 4 | `adicional_dolar` → **`valor_adicional`**, default **2.5**, editable, **a nivel técnico-persona** (aplica a todos sus jobs). |
| 5 | **Partes aparte**: botón "Agregar partes" (por técnico/semana). Al agregar se **elige el job** y se usa **ese % del técnico**. Se **acumulan** y aparecen como **una sola fila `parts`** al final del Excel. |
| 6 | Nuevo tipo de job: **`PVT JOBS`** (además de LOCKOUT, CAR KEY, TODO). |
| 7 | **Métodos de pago por técnico**: cada método tiene `nombre` + `trato` (CASH o CC) + flag `principal`. El trato define qué cálculo aplica. |
| 8 | **MIXTO se mantiene** (un trabajo dividido en efectivo + tarjeta). |

---

## 2. Modelo de datos (5 tablas nuevas + 1 de partes)

### `tecnicos_virginia` (la persona)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| nombre | String, único | upper() |
| valor_adicional | Float | default 2.5 |
| created_at | TIMESTAMP | |

### `config_virginia` (config por tipo de job)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| tecnico_virginia_id | FK → tecnicos_virginia (CASCADE) | |
| job | String | LOCKOUT / CAR KEY / PVT JOBS / TODO |
| porcentaje_tecnico | Float | |
| porcentaje_gil | Float | = 100 − porcentaje_tecnico (auto) |
| minimo | Float | |
| cargo_sabados | Float | |
| porcentaje_adicional_empresa | Float | |
| UNIQUE(tecnico_virginia_id, job) | | |

> Eliminados respecto al general: `adicional_dolar` (→ valor_adicional en persona) y `porcentaje_cc`.

### `metodos_pago_virginia`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| tecnico_virginia_id | FK → tecnicos_virginia (CASCADE) | |
| nombre | String | ej: Zelle, Cash, Visa |
| trato | String | 'CASH' o 'CC' |
| principal | Boolean | default False |
| created_at | TIMESTAMP | |

### `semanas_virginia`
Igual a `semanas_tecnico` pero independiente: `year_num`, `numero_semana`, `semana` (label), `fecha_inicio`, `fecha_fin`, `estado`. UNIQUE(year_num, numero_semana).

### `registros_virginia`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| tecnico_virginia_id | FK → tecnicos_virginia (CASCADE) | |
| semana_virginia_id | FK → semanas_virginia (CASCADE) | |
| nombre | String | |
| job | String | |
| job_name | String | ID del trabajo |
| valor_servicio | Float | |
| metodo_pago | String | nombre del método usado |
| tipo_pago | String | trato efectivo: CASH / CC / MIXTO |
| valor_efectivo | Float | |
| valor_tarjeta | Float | |
| porcentaje_tecnico | Float | snapshot |
| subtotal | Float | |
| total | Float | |
| created_at | TIMESTAMP | |

> **Eliminados** respecto al general: `partes_gil`, `partes_tecnico`, `tech`, `porcentaje_cc`.

### `partes_virginia` (line items que alimentan la fila `parts`)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | PK | |
| tecnico_virginia_id | FK → tecnicos_virginia (CASCADE) | |
| semana_virginia_id | FK → semanas_virginia (CASCADE) | |
| job | String | job elegido al agregar (define el %) |
| valor | Float | monto ingresado |
| porcentaje_tecnico | Float | snapshot del % del job |
| created_at | TIMESTAMP | |

> En el Excel se **acumulan en una sola fila** `parts`. Contribución al BALANCED TECH = Σ(valor × porcentaje_tecnico / 100). Solo afecta el balance, no las ventas/cash/cc.

---

## 3. Cálculos (adaptación de `procesarData`)

Versión Virginia del motor (`Utils/api.js` → nuevo `Utils/virginiaCalc.js`), sin tocar el general:

- **cash():** `valorReal = valor_servicio` (sin partes). Usa `valor_adicional` en vez de `adicional_dolar`. Sin `porcentaje_cc`.
- **CC():** igual a la `CC()` actual pero **sin `porcentaje_cc` ni partes**, usando `valor_adicional`. Total **negativo** (balance que suma al BALANCED TECH). ✅ confirmado.
- **mixto():** divide efectivo (cash) + tarjeta (CC), sin partes ni `porcentaje_cc`.
- **trato del método = tipo_pago:** método con `trato=CASH` → `cash()`; `trato=CC` → `CC()`. MIXTO sigue como opción de pago dividido.
- Se elimina el mecanismo `is_cash` (queda subsumido por el `trato` del método).

---

## 4. Excel de Virginia (versión propia de `utils.py`)

**Tabla principal — columnas:**
`NAME · ID JOB · % · PAYMENT TYPE · SALES · [CASH · CC si hay MIXTO] · TOTAL`
> Eliminadas: `4%CC`, `GIL PARTS`, `TECH PARTS`, `TECH`.

**Tabla de resultados:** `TOTAL JOBS · TOTAL CASH · TOTAL CC · TOTAL SALES · AVERAGE SALES`
> (Se quita `TOTAL PARTS` de aquí; las partes van en su fila propia.)

**Fila `parts` (al final):** `ID JOB="parts" · % = % técnico · SALES = valor`. Solo impacta BALANCED TECH.

**BALANCED TECH** = Σ(registros.total) + Σ(partes.valor × %/100).

---

## 5. Backend (módulos nuevos)

| Archivo | Contenido |
|---------|-----------|
| `models_virginia.py` | Las 6 tablas |
| `schemmas_virginia.py` | Schemas pydantic propios |
| `controllers_virginia.py` | Lógica del motor (técnicos, config, métodos, semanas, registros, partes, excel, parser IA Virginia) |
| `routes_virginia.py` | Router prefijo `/api/virginia` |
| `main.py` | (solo) registrar el router nuevo |

**Endpoints previstos (`/api/virginia/...`):**
- Técnicos persona: listar / crear / editar / eliminar
- Config por job: listar / editar por técnico
- Métodos de pago: listar / crear / editar / eliminar (con `principal`)
- Semanas: validar/crear semana actual / historial
- Registros: cargar / obtener / editar (individual + bulk) / eliminar
- Partes: agregar / listar / eliminar por técnico+semana
- Export Excel por técnico/semana
- Validar job duplicado
- Parser IA Virginia (prompt separado)

---

## 6. Frontend (árbol propio)

| Ruta / archivo | Contenido |
|----------------|-----------|
| `Services/virginiaServices.js` | Llamadas a `/api/virginia/...` |
| `app/virginia/page.jsx` | CRUD técnicos Virginia + acceso a métodos de pago |
| `app/virginia/table/columnasVirginia.js` | Columnas propias (sin partes/tech/%cc) |
| `app/virginia/schemas/virginiaSchema.js` | Validación Zod propia |
| `app/virginia/hooks/useVirginiaActions.js` | Lógica de la tabla técnicos |
| `app/virginia/metodos/...` | UI nueva de métodos de pago (nombre + trato + principal) |
| `app/virginia/[nombre]/[semana]/...` | Carga de registros + botón "Agregar partes" |
| `Utils/virginiaCalc.js` | `procesarData` adaptado |
| `page.js` (home) | (solo) acceso nuevo a `/virginia` |

Se **reutilizan** los componentes presentacionales config-driven (`TablaTrabajos`, `CellRenderer`, vistas Desktop/Mobile) alimentándolos con la config de Virginia.

---

## 7. Creación de tablas — Script `create_all` de un solo uso (criticidad 🔴, aditivo)

Sin Alembic. Se usa `Base.metadata.create_all(bind=engine)`, que **solo crea las tablas que no existen** (saltea las generales ya existentes).

1. Definir los modelos Virginia (Fase 1).
2. Script `BackEnd/crear_tablas_virginia.py` → importa `Base` + modelos Virginia y ejecuta `create_all(bind=engine)`.
3. Se corre **una sola vez** tras tener los modelos listos.

> **Limitación conocida:** `create_all` crea tablas nuevas pero **no aplica cambios futuros de columnas**. Si más adelante el esquema Virginia cambia mucho, se evaluará Alembic.
> **Riesgo:** mínimo y aditivo — no toca tablas existentes. **Rollback:** `DROP TABLE` manual de las 6 nuevas.

---

## 8. Fases de ejecución (cada una requiere tu OK)

- **Fase 1 — Backend Virginia:** modelos + schemas + controllers + routes + script `create_all` para las 6 tablas. Probado con curl/Postman. *(🔴 crea tablas en Neon — aditivo)*
- **Fase 2 — Motor de cálculo + Excel Virginia:** `virginiaCalc.js` + Excel propio, validados con casos de ejemplo.
- **Fase 3 — Frontend técnicos + métodos de pago:** CRUD persona, config por job, métodos (nombre/trato/principal).
- **Fase 4 — Frontend registros + partes + parser IA:** carga semanal, botón "Agregar partes", parser IA Virginia, export Excel.
- **Fase 5 — Navegación y cierre:** acceso desde el home, pruebas end-to-end.

---

## 9. Pendientes menores a resolver durante implementación

- Formato exacto de la fila `parts` en Excel cuando hay varios jobs con % distintos (se acumulan; el % mostrado se define en Fase 2).
- Texto final del prompt IA de Virginia (se redacta en Fase 4, basado en el del general).
- Confirmar si los métodos de pago se listan como opciones de `tipo_pago` en la carga, además de MIXTO.

---

_Generado como plan base. Inicio sujeto a aprobación, fase por fase._
