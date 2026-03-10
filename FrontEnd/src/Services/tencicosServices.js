const APIURL = process.env.NEXT_PUBLIC_API_URL
console.log(APIURL)
export async function obtenerTecnicos() {
    const response = await fetch(`${APIURL}/api`)
    if (!response.ok) {
        throw new Error("Error en la petición")
    }

    const data = await response.json()
    return data
}

export async function confirmarTecnico(nombre) {
    const res = await fetch(`${APIURL}/api/infoTecnico/${nombre}`);
    if (!res.ok) throw new Error("Error al traer la informacion del tecnico");
    return await res.json();
}

export async function ValidarSemanaTecnico() {
    const res = await fetch(`${APIURL}/api/validarSemana`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Error al validar la semana del tecnico");
    return await res.json();
}

export async function envioTablaDB(listaRegistros) {
    const res = await fetch(`${APIURL}/api/registrosDataBase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listaRegistros),
    });
    if (!res.ok) throw new Error("No fue posible enviar los registros a la DB");
    return await res.json();
}

export async function traerDatosCartas() {
    const res = await fetch(`${APIURL}/api/informacionGeneralRegistros`);
    if (!res.ok) throw new Error("Error al traer la informacion para construir las cartas");
    return await res.json();
}

export async function getRegistrosPrevios(nombre, semana) {
    const res = await fetch(`${APIURL}/api/obtenerRegistros/${nombre}/${semana}`);
    if (!res.ok) throw new Error("Error, no fue posible obtener los registros para ", nombre);
    return await res.json();
}

export async function eleiminarRegistrosDb(registros) {
  try {
    const response = await fetch(`${APIURL}/api/eliminarRegistrosSelecionados`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registros),
    });

    if (!response.ok) {
      throw new Error("Error eliminando registros");
    }

  } catch (error) {
    console.error(error);
  }
}

export async function exportarExcelDBPost(registros,nombre,semana) {
  try {
    const response = await fetch(`${APIURL}/api/exportToExcel/${nombre}/${semana}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registros),
    });

    if (!response.ok) {
      throw new Error("No fue posible exportar el excel");
    }

    return response

  } catch (error) {
    console.error(error);
  }
}


export async function obtenerHistorial(nombreTecnico) {
    const res = await fetch(`${APIURL}/api/historial-tecnico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"nombre":nombreTecnico}),
    });
    if (!res.ok) throw new Error("No fue posible obtener el historial del tecnico");
    return await res.json();
}

export async function traerTecnicosSemana(semana) {
    console.log(semana)
    const res = await fetch(`${APIURL}/api/historial-semana-tecnicos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({"semana_id":semana}),
    });
    if (!res.ok) throw new Error("No fue posible obtener el historial del tecnico");
    return await res.json();
}

export async function traerSemanas() {
    const res = await fetch(`${APIURL}/api/historial-semanas`);
    if (!res.ok) throw new Error("No fue posible obteniendo las semanas creadas");
    return await res.json();
}
