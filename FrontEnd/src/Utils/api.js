export function procesarDatosTecnico(datos, datosPrevios = null, mensaje = false) {
  // Función que crea la base de un trabajo
  console.log(datos, datosPrevios)
  const crearBase = (dato) => {
    console.log(dato)
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
      porcentaje_cc: dato.porcentaje_cc,
      partes_gil: 0,
      partes_tecnico: 0,
      tech: 0,
      subtotal: 0,
      total: 0,
      adicional_dolar: dato.adicional_dolar,
      id_registro:datosPrevios?.id ?? null,
      aplica_dolar_empresa:dato.porcentaje_adicional_empresa > 0? "SI": "NO",
      dolar_adicional_empresa: dato.porcentaje_adicional_empresa,
      notas: []
    };

    base.notas.push(`El minimo de este tecnico es de ${dato.minimo} dolares`)
    // Notas dinámicas
    if (dato.porcentaje_adicional_empresa !== 0) {
      base.notas.push(
        `Este técnico tiene un porcentaje adicional para ciertos servicios de ${dato.porcentaje_adicional_empresa}$`
      );
    }
    if (dato.cargo_sabados !== 0) {
      base.notas.push(
        `Este técnico tiene un porcentaje diferente si el servicio lo realizo el dia sabado, el porcentaje es de ${dato.cargo_sabados}%`
      );
    }

    return base;
  };

  // Función que combina base + datosPrevios si coincide el job
  const combinarConPrevios = (dato, mensaje) => {
    const base = crearBase(dato);
    const idtecnico =crypto.randomUUID()
    // Si no hay datosPrevios, devolvemos la base directamente
    if (!datosPrevios) {
      return base;
    }
    console.log(base)
    console.log(datosPrevios)
    // Solo sobreescribimos si el job coincide
    if (datosPrevios.job.replace(/\s+/g, "") === dato.job.replace(/\s+/g, "")) {
      console.log(mensaje)
      if(mensaje) {
        const resultado = {
          ...base,
          job_name:datosPrevios.job_name,
          valor_servicio: datosPrevios.valor_servicio,
          valor_efectivo: datosPrevios.valor_efectivo,
          valor_tarjeta: datosPrevios.valor_tarjeta,
          partes_tecnico: datosPrevios.partes_tecnico,
          partes_gil: datosPrevios.partes_gil,
          tipo_pago: datosPrevios.tipo_pago,
          tech: datosPrevios.tech,
          id_registro: null,
          nuevo:false, 
          id:idtecnico
        }
        console.log(resultado)
        return resultado
      }

      return {...base,...datosPrevios, nuevo:false, id:idtecnico};
    }

  };

  // 🔹 Si datos es lista → iteramos
  if (Array.isArray(datos)) {
    console.log(datos)
    return datos.map(dato => combinarConPrevios(dato, mensaje)).filter(dat=>(dat));
  }
  // 🔹 Si datos es un solo objeto → procesamos directamente
  return crearBase(datos)
}

function getISOYearWeek(date = new Date()) {
  const tempDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));

  // ISO: mover al jueves de esta semana
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));

  const isoYear = tempDate.getUTCFullYear();

  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);

  return {
    isoYear,
    isoWeek: weekNo
  };
}

export function formatoFinal() {
  const hoy = new Date();
  const { isoYear, isoWeek } = getISOYearWeek(hoy);

  // Anclar al lunes de la semana ISO
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay(); // domingo=7
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (diaSemana - 1));

  const mes = String(lunes.getMonth() + 1).padStart(2, "0");

  return `${isoYear}_${mes}_semana_${String(isoWeek).padStart(2, "0")}`;
}

export function formatearNumero(num) {
    return Number.isInteger(num) 
        ? num 
        : Number(num.toFixed(2))
}


function cash(params) {

  const porcentajeT = params.porcentaje_tecnico
  const porcentajeGil = 100 - porcentajeT

  const valorReal =
    params.valor_servicio -
    params.partes_tecnico -
    params.partes_gil

  const procesoTecnico =
    params.valor_servicio * (porcentajeT / 100)

  const valorDescontar = params.tech
    ? valorReal - params.tech
    : valorReal * (porcentajeGil / 100)

  // CASO 1
  if (
    params.valor_servicio <= params.minimo + 25 &&
    params.tipo_pago !== "MIXTO"
  ) {
    return {
      ...params,
      total: formatearNumero((valorReal / 2) + params.adicional_dolar)
    }
  }

  // CASO 2
  if (
    procesoTecnico > params.minimo ||
    params.tipo_pago === "MIXTO"
  ) {
    return {
      ...params,
      total: formatearNumero(
        valorDescontar +
        params.partes_gil +
        params.adicional_dolar
      )
    }
  }

  // CASO 3
  if (
    procesoTecnico > 0 &&
    procesoTecnico <= params.minimo
  ) {
    return {
      ...params,
      total: formatearNumero(
        (valorReal - params.minimo) +
        params.adicional_dolar
      )
    }
  }

  return params
}



function CC(params) {

  const porcentajeT = params.porcentaje_tecnico

  const descuentoTarjeta =
    params.valor_servicio *
    (params.porcentaje_cc / 100)

  const valorRealTarjeta =
    params.valor_servicio -
    descuentoTarjeta -
    params.partes_tecnico -
    params.partes_gil

  const procesoTecnico =
    valorRealTarjeta *
    (porcentajeT / 100)

  const valorDescontar = params.tech
    ? valorRealTarjeta - params.tech
    : procesoTecnico

  // CASO 1
  if (
    params.valor_servicio <= params.minimo + 25 &&
    params.tipo_pago !== "MIXTO"
  ) {
    return {
      ...params,
      total: formatearNumero(
        ((valorRealTarjeta / 2) -
          params.adicional_dolar +
          params.partes_tecnico) * -1
      )
    }
  }

  // CASO 2
  if (
    procesoTecnico > params.minimo ||
    params.tipo_pago === "MIXTO"
  ) {
    return {
      ...params,
      total: formatearNumero(
        (valorDescontar +
          params.partes_tecnico -
          params.adicional_dolar) * -1
      )
    }
  }

  // CASO 3
  if (
    procesoTecnico > 0 &&
    procesoTecnico <= params.minimo
  ) {
    return {
      ...params,
      total: formatearNumero(
        (
          (params.minimo - descuentoTarjeta) +
          params.partes_tecnico -
          params.partes_gil -
          params.adicional_dolar
        ) * -1
      )
    }
  }

  return params
}



function mixto(params) {

  const cashParams = {
    ...params,
    valor_servicio: params.valor_efectivo
  }

  const ccParams = {
    ...params,
    valor_servicio: params.valor_tarjeta,
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


export function procesarData(data){
    data.aplica_dolar_empresa === "SI" ? data.adicional_dolar = data.dolar_adicional_empresa: data
    if (data.tipo_pago.toLowerCase() == "cc") return CC(data)
    if (data.tipo_pago.toLowerCase() == "cash") return cash(data)
    return mixto(data)
}


export function formatearFechaSemana(fecha){
  const meses = {
    1: "ENERO",
    2: "FEBRERO",
    3: "MARZO",
    4: "ABRIL",
    5: "MAYO",
    6: "JUNIO",
    7: "JULIO",
    8: "AGOSTO",
    9: "SEPTIEMBRE",
    10: "OCTUBRE",
    11: "NOVIEMBRE",
    12: "DICIEMBRE"
  };

  const fechaFormato = `${fecha.split("-")[2]} -${meses[Number(fecha.split("-")[1])]}`

  return fechaFormato

}
