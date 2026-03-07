export function procesarDatosTecnico(datos, datosPrevios = null) {
  // Función que crea la base de un trabajo
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
      tipo_pago: "",
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
      notas: []
    };

    base.notas.push(`El minimo de este tecnico es de ${dato.minimo} dolares`)
    // Notas dinámicas
    if (dato.porcentaje_adicional_empresa !== 0) {
      base.notas.push(
        `Este técnico tiene un porcentaje adicional para ciertos servicios de ${dato.porcentaje_adicional_empresa}%`
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
  const combinarConPrevios = (dato) => {
    const base = crearBase(dato);
    const idtecnico =crypto.randomUUID()
    // Si no hay datosPrevios, devolvemos la base directamente
    if (!datosPrevios) {
      return base;
    }

    // Solo sobreescribimos si el job coincide
    if (datosPrevios.job === dato.job) {
      console.log({ ...base, ...datosPrevios })
      return { ...base, ...datosPrevios, nuevo:false, id:idtecnico};
    }

  };

  // 🔹 Si datos es lista → iteramos
  if (Array.isArray(datos)) {
    return datos.map(dato => combinarConPrevios(dato)).filter(dat=>(dat));
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

  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return `${isoYear}_${mes}_semana_${String(isoWeek).padStart(2, "0")}`;
}

function formatearNumero(num) {
    return Number.isInteger(num) 
        ? num 
        : Number(num.toFixed(2))
}


function cash(params) {
  const porcentaje_T = params.porcentaje_tecnico
  const porcentaje_Gil = 100 - params.porcentaje_tecnico
  const procesoAcabo= params.valor_servicio * (porcentaje_T/100)
  const valorReal = params.valor_servicio - params.partes_tecnico - params.partes_gil
  const valorDescontar = params.tech ? valorReal - params.tech  : (valorReal * (porcentaje_Gil/100))

  if(procesoAcabo > params.minimo){
    console.log(valorDescontar + params.adicional_dolar)
    params.total = formatearNumero(valorDescontar + params.partes_gil + params.adicional_dolar)
  }else if (procesoAcabo > 0 && procesoAcabo <= params.minimo){
    params.total = formatearNumero((params.valor_servicio-params.minimo) + params.adicional_dolar)
  }

  return params
}

function CC(params) {
  const porcentaje_T = params.porcentaje_tecnico // 30
  const descuentoTarjeta = params.valor_servicio * (params.porcentaje_cc/100) // 8
  const valorRealTarjeta = params.valor_servicio-descuentoTarjeta - params.partes_tecnico - params.partes_gil // 192
  const procesoAcabo= (valorRealTarjeta * (porcentaje_T/100))  // 60
  const valorDescontar = params.tech ? valorRealTarjeta - params.tech : procesoAcabo
  console.log(porcentaje_T,descuentoTarjeta,valorRealTarjeta,procesoAcabo,valorDescontar)

  if(procesoAcabo > params.minimo){
    params.total = formatearNumero((valorDescontar + params.partes_tecnico - params.adicional_dolar) * -1)
  }else if (procesoAcabo > 0 && procesoAcabo <= params.minimo){
    params.total = formatearNumero(((params.minimo-descuentoTarjeta) + params.partes_tecnico - params.partes_gil - params.adicional_dolar) * -1)
  }

  return params
}

function mixto(params) {
  const valorServicioReal = params.valor_servicio

  params.valor_servicio = params.valor_efectivo
  const valorCash = cash(params)

  params.valor_servicio = params.valor_tarjeta
  const valorCC =  CC(params)

  params.valor_servicio = valorServicioReal
  
  params.total = valorCash.total + valorCC.total

  return params
}



export function procesarData(data){
  
    if (data.tipo_pago.toLowerCase() == "cc") return CC(data)
    if (data.tipo_pago.toLowerCase() == "cash") return cash(data)
    return mixto(data)
}

export function validarDatos(data){

}


