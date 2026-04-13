export function procesarDatosTecnico(datos, datosPrevios = null, mensaje = false) {
  const crearBase = (dato) => {
    const base = {
      id: "",
      id_tecnico: dato.id,
      nombre: dato.nombre,
      job: dato.job,
      job_name: "",
      porcentaje_tecnico: dato.porcentaje_tecnico,
      valor_servicio: 0,
      minimo: dato.minimo,
      opciones_pago: ["CASH", "CC", "MIXTO"],
      tipo_pago: "CASH",
      valor_tarjeta: 0,
      valor_efectivo: 0,
      porcentaje_cc: 0,
      porcentaje_cc_base: dato.porcentaje_cc,
      porcentaje_cc_original: dato.porcentaje_cc,
      partes_gil: 0,
      partes_tecnico: 0,
      tech: 0,
      subtotal: 0,
      total: 0,
      is_cash: false,
      adicional_dolar: dato.adicional_dolar,
      id_registro: datosPrevios?.id ?? null,
      aplica_dolar_empresa: dato.porcentaje_adicional_empresa > 0 ? "SI" : "NO",
      dolar_adicional_empresa: dato.porcentaje_adicional_empresa,
      notas: []
    }

    base.notas.push(`El minimo de este tecnico es de ${dato.minimo} dolares`)
    if (dato.porcentaje_adicional_empresa !== 0) {
      base.notas.push(
        `Este técnico tiene un porcentaje adicional para ciertos servicios de ${dato.porcentaje_adicional_empresa}$`
      )
    }
    if (dato.cargo_sabados !== 0) {
      base.notas.push(
        `Este técnico tiene un porcentaje diferente si el servicio lo realizo el dia sabado, el porcentaje es de ${dato.cargo_sabados}%`
      )
    }

    return base
  }

  const combinarConPrevios = (dato, mensaje) => {
    const base = crearBase(dato)
    const idtecnico = crypto.randomUUID()

    // Sin previos: devuelve base limpia
    if (!datosPrevios) return base

    // Si el job no matchea, retorna base en vez de undefined silencioso
    if (datosPrevios.job.replace(/\s+/g, "") !== dato.job.replace(/\s+/g, "")) {
      return base
    }

    if (mensaje) {
      return {
        ...base,
        job_name: datosPrevios.job_name,
        valor_servicio: datosPrevios.valor_servicio,
        valor_efectivo: datosPrevios.valor_efectivo,
        valor_tarjeta: datosPrevios.valor_tarjeta,
        partes_tecnico: datosPrevios.partes_tecnico,
        partes_gil: datosPrevios.partes_gil,
        tipo_pago: datosPrevios.tipo_pago,
        tech: datosPrevios.tech,
        id_registro: null,
        nuevo: false,
        id: idtecnico
      }
    }

    return { ...base, ...datosPrevios, nuevo: false, id: idtecnico }
  }

  if (Array.isArray(datos)) {
    return datos.map(dato => combinarConPrevios(dato, mensaje)).filter(Boolean)
  }
  return crearBase(datos)
}

function getISOYearWeek(date = new Date()) {
  const tempDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ))
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7))
  const isoYear = tempDate.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const weekNo = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7)
  return { isoYear, isoWeek: weekNo }
}

export function formatoFinal() {
  const hoy = new Date()
  const { isoYear, isoWeek } = getISOYearWeek(hoy)
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (diaSemana - 1))
  const mes = String(lunes.getMonth() + 1).padStart(2, "0")
  return `${isoYear}_${mes}_semana_${String(isoWeek).padStart(2, "0")}`
}

export function formatearNumero(num) {
  return Number.isInteger(num)
    ? num
    : Number(num.toFixed(2))
}

// Calcula porcentaje_cc en dólares para el autocomplete de la fila editable.
// Se llama SOLO desde renderCell — nunca desde procesarData.
export function actualizarPorcentajeCC(row) {
  const tipo = row.tipo_pago?.toLowerCase()
  if (
    (tipo === "cc" || tipo === "mixto") &&
    row.porcentaje_cc_base != null &&
    row.valor_servicio > 0
  ) {
    return {
      ...row,
      porcentaje_cc: formatearNumero(
        row.valor_servicio * (row.porcentaje_cc_base / 100)
      )
    }
  }
  return row
}

function cash(params) {
  const porcentajeT = params.porcentaje_tecnico
  const porcentajeGil = 100 - porcentajeT

  const valorReal =
    params.valor_servicio -
    params.partes_tecnico -
    params.partes_gil

  const procesoTecnico = valorReal * (porcentajeGil / 100)
  if (params.tech !== 0) return {
    ...params,
    total: formatearNumero(valorReal - params.tech + params.adicional_dolar + params.partes_gil)
  }
  if (params.valor_servicio <= params.minimo + 25 && params.tipo_pago !== "MIXTO") {
    return {
      ...params,
      total: formatearNumero((valorReal / 2) + params.adicional_dolar)
    }
  }

  if (procesoTecnico > params.minimo || params.tipo_pago === "MIXTO") {
    return {
      ...params,
      total: formatearNumero(
        procesoTecnico +
        params.partes_gil +
        params.adicional_dolar
      )
    }
  }

  if (procesoTecnico > 0 && procesoTecnico <= params.minimo) {
    return {
      ...params,
      total: formatearNumero(
        (valorReal - params.minimo) +
        params.adicional_dolar + params.partes_gil
      )
    }
  }

  return params
}

function CC(params) {
  const porcentajeT = params.porcentaje_tecnico

  // porcentaje_cc ya es un valor fijo en dólares — solo se descuenta, nunca se recalcula
  const valorRealTarjeta =
    params.valor_servicio -
    params.porcentaje_cc -
    params.partes_tecnico -
    params.partes_gil

  const procesoTecnico = valorRealTarjeta * (porcentajeT / 100)

  if (params.tech !== 0) return {
  ...params,
  total: formatearNumero((params.tech - params.porcentaje_cc + params.partes_tecnico - params.adicional_dolar) * -1)
  } 
  if (params.valor_servicio <= params.minimo + 25 && params.tipo_pago !== "MIXTO") {
    return {
      ...params,
      total: formatearNumero(
        ((valorRealTarjeta / 2) - params.adicional_dolar + params.partes_tecnico) * -1
      )
    }
  }

  if (procesoTecnico > params.minimo || params.tipo_pago === "MIXTO") {
    return {
      ...params,
      total: formatearNumero(
        (procesoTecnico + params.partes_tecnico - params.adicional_dolar) * -1
      )
    }
  }

  if (procesoTecnico > 0 && procesoTecnico <= params.minimo) {
    return {
      ...params,
      total: formatearNumero(
        (params.minimo - params.porcentaje_cc + params.partes_tecnico - params.partes_gil - params.adicional_dolar) * -1
      )
    }
  }

  return params
}

function ccComoCash(params) {
  const valorServicioOriginal = params.valor_servicio
  
  const resultado = cash({
    ...params,
    valor_servicio: params.valor_servicio - params.porcentaje_cc
  })

  return {
    ...resultado,
    valor_servicio: valorServicioOriginal  // 👈 restaurar el original
  }
}

function mixto(params) {
  const cashParams = {
    ...params,
    valor_servicio: params.valor_efectivo
  }

  const ccParams = {
    ...params,
    valor_servicio: params.valor_tarjeta,
    // porcentaje_cc ya viene fijo en dólares — no se recalcula
    adicional_dolar: 0,
    partes_gil: 0,
    partes_tecnico: 0
  }

  const valorCash = cash(cashParams)
  const valorCC = CC(ccParams)

  return {
    ...params,
    total: valorCash.total + valorCC.total
  }
}



export function procesarData(data) {
  // Fix: no mutar el objeto original — trabajar sobre una copia
  const d = { ...data }

  if (d.aplica_dolar_empresa === "SI") {
    d.adicional_dolar = d.dolar_adicional_empresa
  }

  // porcentaje_cc ya es un valor fijo en dólares aprobado por el usuario.
  // No se recalcula aquí bajo ningún motivo.
  if (d.tipo_pago.toLowerCase() === "cc" && d.is_cash === true) return ccComoCash(d)
  if (d.tipo_pago.toLowerCase() === "cc") return CC(d)
  if (d.tipo_pago.toLowerCase() === "mixto") return mixto(d)
  return cash(d)
}

export function formatearFechaSemana(fecha) {
  const meses = {
    1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
    5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
    9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
  }
  const fechaFormato = `${fecha.split("-")[2]} -${meses[Number(fecha.split("-")[1])]}`
  return fechaFormato
}

export function mapearErroresZod(error) {
    return error.issues.map(issue => ({
        label: issue.path[0].replaceAll("_", " ").toUpperCase(),
        message: issue.message,
        key: issue.path[0],
    }))
}