import { api } from "./api.js"

export const obtenerTecnicos = () =>
    api.get("/api")

export const confirmarTecnico = (nombre) =>
    api.get(`/api/infoTecnico/${nombre}`)

export const ValidarSemanaTecnico = (semana = null) =>
    api.post("/api/validarSemana", { semana })

export const envioTablaDB = (listaRegistros, semana) =>
    api.post("/api/registrosDataBase", { registros: listaRegistros, semana })

export const traerDatosCartas = () =>
    api.get("/api/informacionGeneralRegistros")

export const getRegistrosPrevios = (nombre, semana) =>
    api.get(`/api/obtenerRegistros/${nombre}/${semana}`)

export const eliminarRegistrosDb = (registros) =>
    api.delete("/api/eliminarRegistrosSelecionados", registros)

export const exportarExcelDBPost = (registros, nombre, semana) =>
    api.postRaw(`/api/exportToExcel/${nombre}/${semana}`, registros)

export const obtenerHistorial = (nombreTecnico) =>
    api.post("/api/historial-tecnico", { nombre: nombreTecnico })

export const traerTecnicosSemana = (semana) =>
    api.post("/api/historial-semana-tecnicos", { semana_id: semana })

export const traerSemanas = () =>
    api.get("/api/historial-semanas")

export const semanasRecientes = (n = 8) =>
    api.get(`/api/semanas-recientes?n=${n}`)

export const traerHistorialTodos = () =>
    api.get("/api/historial-todos")

export const eliminarSemana = (semana_id) =>
    api.delete("/api/delete-historial-semana", { semana_id })

export const eliminarTecnicoSemana = (nombre, semana_id) =>
    api.delete("/api/delete-historial-tecnico", { semana_id, nombre })

export const parsearMensaje = (mensaje) =>
    api.post("/api/parsear-mensaje", { mensaje })

export const updateRegistro = (id, data) =>
    api.put(`/api/update-registro/${id}`, data)

export const obtenerTrabajos = () =>
    api.get("/api/trabajos")

export const crearTrabajo = (data) =>
    api.post("/api/trabajos", data)

export const actualizarTrabajo = (id, data) =>
    api.put(`/api/trabajos/${id}`, data)

export const eliminarTrabajo = (id) =>
    api.delete(`/api/trabajos/${id}`)

export const validarJobDuplicado = (job_name) =>
    api.get(`/api/validar-job/${encodeURIComponent(job_name)}`)

export const bulkUpdateRegistros = (registros) =>
    api.put("/api/bulk-update-registros", registros)

// ── Notas ───────────────────────────────────────
export const listarNotas = (nombre, semana) =>
    api.get(`/api/notas/${encodeURIComponent(nombre)}/${semana}`)

export const seedNotas = (nombre, semana, notas) =>
    api.post("/api/notas/seed", { nombre, semana, notas })

export const crearNota = (nombre, semana, texto, orden = 0) =>
    api.post("/api/notas", { nombre, semana, texto, orden })

export const actualizarNota = (id, texto) =>
    api.put(`/api/notas/${id}`, { texto })

export const eliminarNota = (id) =>
    api.delete(`/api/notas/${id}`)