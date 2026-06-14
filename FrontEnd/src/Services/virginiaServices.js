import { api } from "./api.js"

const BASE = "/api/virginia"

// ── Técnicos (persona) ──────────────────────────
export const vaObtenerTecnicos = () => api.get(`${BASE}/tecnicos`)
export const vaObtenerNombres = () => api.get(`${BASE}/nombres`)
export const vaInfoTecnico = (nombre) => api.get(`${BASE}/infoTecnico/${encodeURIComponent(nombre)}`)
export const vaCrearTecnico = (data) => api.post(`${BASE}/tecnicos`, data)
export const vaActualizarTecnico = (id, data) => api.put(`${BASE}/tecnicos/${id}`, data)
export const vaEliminarTecnico = (id) => api.delete(`${BASE}/tecnicos/${id}`)

// ── Config por job ──────────────────────────────
export const vaObtenerConfig = (tecnicoId) => api.get(`${BASE}/config/${tecnicoId}`)
export const vaCrearConfig = (data) => api.post(`${BASE}/config`, data)
export const vaActualizarConfig = (id, data) => api.put(`${BASE}/config/${id}`, data)
export const vaEliminarConfig = (id) => api.delete(`${BASE}/config/${id}`)

// ── Métodos de pago ─────────────────────────────
export const vaObtenerMetodos = (tecnicoId) => api.get(`${BASE}/metodos-pago/${tecnicoId}`)
export const vaCrearMetodo = (data) => api.post(`${BASE}/metodos-pago`, data)
export const vaActualizarMetodo = (id, data) => api.put(`${BASE}/metodos-pago/${id}`, data)
export const vaEliminarMetodo = (id) => api.delete(`${BASE}/metodos-pago/${id}`)

// ── Semanas ─────────────────────────────────────
export const vaValidarSemana = (semana = null) => api.post(`${BASE}/validarSemana`, { semana })
export const vaHistorialSemanas = () => api.get(`${BASE}/historial-semanas`)
export const vaSemanasRecientes = (n = 8) => api.get(`${BASE}/semanas-recientes?n=${n}`)
export const vaHistorialTecnico = (nombre) => api.get(`${BASE}/historial-tecnico/${encodeURIComponent(nombre)}`)
export const vaHistorialTodos = () => api.get(`${BASE}/historial-todos`)
export const vaTecnicosPorSemana = (semana_id) => api.post(`${BASE}/historial-semana-tecnicos`, { semana_id })
export const vaEliminarSemana = (semana_id) => api.delete(`${BASE}/delete-historial-semana`, { semana_id })
export const vaEliminarTecnicoSemana = (nombre, semana_id) => api.delete(`${BASE}/delete-historial-tecnico`, { nombre, semana_id })

// ── Registros ───────────────────────────────────
export const vaEnviarRegistros = (registros, semana) => api.post(`${BASE}/registrosDataBase`, { registros, semana })
export const vaObtenerRegistros = (nombre, semana) => api.get(`${BASE}/obtenerRegistros/${encodeURIComponent(nombre)}/${semana}`)
export const vaActualizarRegistro = (id, data) => api.put(`${BASE}/update-registro/${id}`, data)
export const vaBulkUpdateRegistros = (registros) => api.put(`${BASE}/bulk-update-registros`, registros)
export const vaEliminarRegistros = (ids) => api.delete(`${BASE}/eliminarRegistros`, ids)
export const vaExportExcel = (registroIds, nombre, semana) =>
    api.postRaw(`${BASE}/exportToExcel/${encodeURIComponent(nombre)}/${semana}`, registroIds)

// ── Partes ──────────────────────────────────────
export const vaAgregarParte = (data) => api.post(`${BASE}/partes`, data)
export const vaObtenerPartes = (tecnicoId, semana) => api.get(`${BASE}/partes/${tecnicoId}/${semana}`)
export const vaEliminarParte = (id) => api.delete(`${BASE}/partes/${id}`)

// ── Parser IA ───────────────────────────────────
export const vaParsearMensaje = (mensaje, metodos = [], nombre = null) =>
    api.post(`${BASE}/parsear-mensaje`, { mensaje, metodos, nombre })
export const vaValidarJob = (job_name) => api.get(`${BASE}/validar-job/${encodeURIComponent(job_name)}`)

// ── Notas ───────────────────────────────────────
export const vaListarNotas = (nombre, semana) => api.get(`${BASE}/notas/${encodeURIComponent(nombre)}/${semana}`)
export const vaSeedNotas = (nombre, semana, notas) => api.post(`${BASE}/notas/seed`, { nombre, semana, notas })
export const vaCrearNota = (nombre, semana, texto, orden = 0) => api.post(`${BASE}/notas`, { nombre, semana, texto, orden })
export const vaActualizarNota = (id, texto) => api.put(`${BASE}/notas/${id}`, { texto })
export const vaEliminarNota = (id) => api.delete(`${BASE}/notas/${id}`)
