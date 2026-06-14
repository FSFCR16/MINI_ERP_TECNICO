// virginiaCalc.js
// Motor de cálculo de VIRGINIA. Adaptado de Utils/api.js (procesarData) con los cambios:
//   - sin partes (partes_gil / partes_tecnico) ni columna tech
//   - sin porcentaje_cc (no se descuenta % de tarjeta)
//   - usa `valor_adicional` (a nivel técnico) en vez de `adicional_dolar`
//   - el `trato` del método de pago (CASH/CC) define el cálculo; sigue existiendo MIXTO
// Es independiente del general: no importa nada de business logic de api.js.

export function formatearNumero(num) {
  return Number.isInteger(num) ? num : Number(num.toFixed(2))
}

// Construye la fila base de un registro Virginia a partir del técnico + su config de job.
export function procesarDatosTecnicoVirginia(datos, datosPrevios = null, mensaje = false) {
  const crearBase = (dato) => {
    const base = {
      id: "",
      id_tecnico: dato.id_tecnico ?? dato.tecnico_virginia_id ?? dato.id,
      nombre: dato.nombre,
      job: dato.job,
      job_name: "",
      porcentaje_tecnico: dato.porcentaje_tecnico,
      participacion: 100, // % propio (trabajo compartido); 100 = job completo
      valor_servicio: 0,
      minimo: dato.minimo,
      metodo_pago: "",
      // opciones de pago dinámicas: nombres de los métodos del técnico + MIXTO
      opciones_pago: dato.opciones_pago ?? [],
      tipo_pago: "CASH",
      valor_tarjeta: 0,
      valor_efectivo: 0,
      subtotal: 0,
      total: 0,
      valor_adicional: dato.valor_adicional ?? 0,
      porcentaje_adicional_empresa: dato.porcentaje_adicional_empresa ?? 0,
      aplica_adicional_empresa: dato.porcentaje_adicional_empresa > 0 ? "SI" : "NO",
      cargo_sabados: dato.cargo_sabados ?? 0,
      id_registro: datosPrevios?.id ?? null,
      notas: [],
    }

    if (dato.minimo != null) {
      base.notas.push(`El minimo de este tecnico es de ${dato.minimo} dolares`)
    }
    if (dato.porcentaje_adicional_empresa) {
      base.notas.push(
        `Este técnico tiene un porcentaje adicional para ciertos servicios de ${dato.porcentaje_adicional_empresa}$`
      )
    }
    if (dato.cargo_sabados) {
      base.notas.push(
        `Este técnico tiene un porcentaje diferente si el servicio fue en sábado: ${dato.cargo_sabados}%`
      )
    }
    return base
  }

  const combinar = (dato) => {
    const base = crearBase(dato)
    if (!datosPrevios) return base
    if ((datosPrevios.job || "").replace(/\s+/g, "") !== (dato.job || "").replace(/\s+/g, "")) {
      return base
    }
    const id = crypto.randomUUID()
    if (mensaje) {
      return {
        ...base,
        job_name: datosPrevios.job_name,
        valor_servicio: datosPrevios.valor_servicio,
        valor_efectivo: datosPrevios.valor_efectivo,
        valor_tarjeta: datosPrevios.valor_tarjeta,
        metodo_pago: datosPrevios.metodo_pago,
        tipo_pago: datosPrevios.tipo_pago,
        id_registro: null,
        nuevo: false,
        id,
      }
    }
    return { ...base, ...datosPrevios, nuevo: false, id }
  }

  if (Array.isArray(datos)) {
    return datos.map(combinar).filter(Boolean)
  }
  return crearBase(datos)
}

// ── CASH ──────────────────────────────────────────────
function cash(params) {
  const porcentajeT = params.porcentaje_tecnico
  const porcentajeGil = 100 - porcentajeT

  const valorReal = params.valor_servicio // sin partes en Virginia
  const minimoTecnicoValidacion = valorReal * (porcentajeT / 100)
  const miniGil = valorReal * (porcentajeGil / 100)

  if (params.valor_servicio <= params.minimo + 25 && params.tipo_pago !== "MIXTO") {
    return { ...params, total: formatearNumero(valorReal / 2 + params.valor_adicional) }
  }

  if (minimoTecnicoValidacion > params.minimo || params.tipo_pago === "MIXTO") {
    return { ...params, total: formatearNumero(miniGil + params.valor_adicional) }
  }

  if (minimoTecnicoValidacion > 0 && minimoTecnicoValidacion <= params.minimo) {
    return { ...params, total: formatearNumero(valorReal - params.minimo + params.valor_adicional) }
  }

  return params
}

// ── CC ────────────────────────────────────────────────
// Igual estructura que el general pero SIN porcentaje_cc ni partes.
// El total es negativo (balance que el técnico debe / se suma al BALANCED TECH).
function CC(params) {
  const porcentajeT = params.porcentaje_tecnico

  const valorRealTarjeta = params.valor_servicio // sin %cc ni partes
  const procesoTecnico = valorRealTarjeta * (porcentajeT / 100)

  if (params.valor_servicio <= params.minimo + 25 && params.tipo_pago !== "MIXTO") {
    return {
      ...params,
      total: formatearNumero((valorRealTarjeta / 2 - params.valor_adicional) * -1),
    }
  }

  if (procesoTecnico > params.minimo || params.tipo_pago === "MIXTO") {
    return {
      ...params,
      total: formatearNumero((procesoTecnico - params.valor_adicional) * -1),
    }
  }

  if (procesoTecnico > 0 && procesoTecnico <= params.minimo) {
    return {
      ...params,
      total: formatearNumero((params.minimo - params.valor_adicional) * -1),
    }
  }

  return params
}

// ── MIXTO ─────────────────────────────────────────────
function mixto(params) {
  const cashParams = { ...params, valor_servicio: params.valor_efectivo }
  const ccParams = { ...params, valor_servicio: params.valor_tarjeta, valor_adicional: 0 }

  const valorCash = cash(cashParams)
  const valorCC = CC(ccParams)

  return { ...params, total: formatearNumero(valorCash.total + valorCC.total) }
}

// ── ENTRYPOINT ────────────────────────────────────────
export function procesarDataVirginia(data) {
  const d = { ...data }

  if (d.aplica_adicional_empresa === "SI") {
    d.valor_adicional = d.porcentaje_adicional_empresa
  }

  const tipo = (d.tipo_pago || "").toLowerCase()
  let res
  if (tipo === "cc") res = CC(d)
  else if (tipo === "mixto") res = mixto(d)
  else res = cash(d)

  // % propio (trabajo compartido): se escala el TOTAL final. 100 = sin cambio.
  const participacion = d.participacion == null ? 100 : d.participacion
  if (participacion !== 100) {
    res = { ...res, total: formatearNumero((res.total || 0) * (participacion / 100)) }
  }
  return res
}

// Contribución de las partes al BALANCED TECH: Σ(valor × % / 100).
export function calcularBalancePartes(partes = []) {
  return formatearNumero(
    partes.reduce((acc, p) => acc + (p.valor || 0) * ((p.porcentaje_tecnico || 0) / 100), 0)
  )
}
