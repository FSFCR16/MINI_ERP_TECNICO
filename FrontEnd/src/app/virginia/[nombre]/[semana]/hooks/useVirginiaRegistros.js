import { useState, useEffect, useCallback, useMemo } from "react"
import {
  vaInfoTecnico, vaValidarSemana,
  vaEnviarRegistros, vaObtenerRegistros, vaActualizarRegistro, vaEliminarRegistros,
  vaAgregarParte, vaObtenerPartes, vaEliminarParte,
  vaExportExcel, vaParsearMensaje, vaCrearMetodo,
} from "@/Services/virginiaServices"
import { procesarDataVirginia, calcularBalancePartes } from "@/Utils/virginiaCalc"
import { formatearFechaSemana } from "@/Utils/api"

function baseRow(tecnico, config) {
  return {
    id: "",
    id_tecnico: tecnico?.id ?? null,
    nombre: tecnico?.nombre ?? "",
    job: config?.job ?? "",
    job_name: "",
    valor_servicio: 0,
    metodo_pago: "",
    tipo_pago: "CASH",
    valor_efectivo: 0,
    valor_tarjeta: 0,
    porcentaje_tecnico: config?.porcentaje_tecnico ?? 0,
    participacion: 100, // % propio (trabajo compartido); 100 = job completo
    minimo: config?.minimo ?? 0,
    valor_adicional: tecnico?.valor_adicional ?? 0,
    porcentaje_adicional_empresa: config?.porcentaje_adicional_empresa ?? 0,
    aplica_adicional_empresa: config?.porcentaje_adicional_empresa > 0 ? "SI" : "NO",
    subtotal: 0,
    total: 0,
  }
}

export function useVirginiaRegistros(nombre, semanaParam) {
  const [tecnico, setTecnico] = useState(null)
  const [semana, setSemana] = useState(semanaParam)
  const [registros, setRegistros] = useState([])
  const [partes, setPartes] = useState([])
  const [rowData, setRow] = useState(baseRow(null, null))
  const [semanaFechas, setSemanaFechas] = useState({ inicio: "", fin: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // opciones de pago: métodos del técnico + MIXTO
  const opcionesPago = useMemo(() => {
    const base = (tecnico?.metodos_pago ?? []).map(m => ({
      value: m.nombre, label: `${m.nombre} (${m.trato})`, trato: m.trato,
    }))
    return [...base, { value: "MIXTO", label: "MIXTO", trato: "MIXTO" }]
  }, [tecnico])

  const jobsDisponibles = useMemo(
    () => (tecnico?.configs ?? []).map(c => c.job),
    [tecnico]
  )

  // ── carga inicial ─────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const info = await vaInfoTecnico(nombre)
        setTecnico(info)
        const semInfo = await vaValidarSemana(semanaParam)
        setSemanaFechas({
          inicio: formatearFechaSemana(semInfo?.fecha_inicio),
          fin: formatearFechaSemana(semInfo?.fecha_fin),
        })
        const primeraConfig = info.configs?.[0] ?? null
        setRow(baseRow(info, primeraConfig))
        const [regs, prts] = await Promise.all([
          vaObtenerRegistros(nombre, semanaParam).catch(() => []),
          vaObtenerPartes(info.id, semanaParam).catch(() => []),
        ])
        setRegistros(regs.map(r => ({ ...r, id_registro: r.id })))
        setPartes(prts)
      } catch (err) {
        console.error(err)
        setError("No se pudo cargar el técnico o la semana")
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [nombre, semanaParam])

  // ── recálculo de la fila editable ─────────────
  const recompute = useCallback((row) => procesarDataVirginia(row), [])

  const cambiarCampo = (key, value) => {
    setRow(prev => {
      let next = { ...prev, [key]: value }

      if (key === "job") {
        const cfg = (tecnico?.configs ?? []).find(c => c.job === value)
        if (cfg) {
          next.porcentaje_tecnico = cfg.porcentaje_tecnico
          next.minimo = cfg.minimo
          next.porcentaje_adicional_empresa = cfg.porcentaje_adicional_empresa
          next.aplica_adicional_empresa = cfg.porcentaje_adicional_empresa > 0 ? "SI" : "NO"
        }
      }

      if (key === "metodo_pago") {
        const op = opcionesPago.find(o => o.value === value)
        next.tipo_pago = op?.trato ?? "CASH"
        if (next.tipo_pago !== "MIXTO") {
          next.valor_efectivo = 0
          next.valor_tarjeta = 0
        }
      }

      return recompute(next)
    })
  }

  // ── alta de registro (diferido: construye la fila local, NO toca la DB) ──
  // Devuelve la fila calculada para que la tabla la inserte en su historial,
  // o null si faltan datos. El guardado real ocurre con el botón Guardar / Ctrl+S.
  const agregarRegistro = () => {
    if (!rowData.job || !rowData.job_name || !rowData.valor_servicio) {
      setError("Faltan datos: job, ID job y valor del servicio son obligatorios")
      return null
    }
    setError(null)
    const calculado = recompute(rowData)
    const local = { ...calculado, id: crypto.randomUUID(), id_registro: null }

    const cfg = (tecnico?.configs ?? []).find(c => c.job === rowData.job)
    setRow(baseRow(tecnico, cfg))
    return local
  }

  // ── partes ────────────────────────────────────
  const agregarParte = async (job, valor) => {
    const cfg = (tecnico?.configs ?? []).find(c => c.job === job)
    const pct = cfg?.porcentaje_tecnico ?? 0
    try {
      const creada = await vaAgregarParte({
        tecnico_virginia_id: tecnico.id,
        semana,
        job,
        valor: Number(valor),
        porcentaje_tecnico: pct,
      })
      setPartes(prev => [...prev, creada])
    } catch (err) {
      console.error(err)
      setError("No se pudo agregar la parte")
    }
  }

  const eliminarParte = async (id) => {
    setPartes(prev => prev.filter(p => p.id !== id))
    try { await vaEliminarParte(id) } catch (err) { console.error(err) }
  }

  // ── parser IA ─────────────────────────────────
  // Devuelve la fila resultante (para que el caller detecte campos faltantes), o null.
  // metodosOverride: lista de métodos a usar (para re-parsear justo después de crear uno,
  // evitando el estado viejo del closure).
  const parsearMensaje = async (mensaje, metodosOverride = null) => {
    try {
      // se mandan los métodos del técnico (nombre+trato) para que la IA mapee el pago,
      // y el nombre del técnico para que detecte su % propio en trabajos compartidos
      const metodosFuente = metodosOverride ?? tecnico?.metodos_pago ?? []
      const metodos = metodosFuente.map(m => ({ nombre: m.nombre, trato: m.trato }))
      const r = await vaParsearMensaje(mensaje, metodos, tecnico?.nombre)
      let next = { ...rowData }
      if (r.job_name) next.job_name = String(r.job_name).toUpperCase()
      if (r.job_type && jobsDisponibles.includes(r.job_type)) {
        next.job = r.job_type
        const cfg = (tecnico?.configs ?? []).find(c => c.job === r.job_type)
        if (cfg) {
          next.porcentaje_tecnico = cfg.porcentaje_tecnico
          next.minimo = cfg.minimo
          next.porcentaje_adicional_empresa = cfg.porcentaje_adicional_empresa
        }
      }
      if (r.valor_servicio) next.valor_servicio = r.valor_servicio
      if (r.valor_efectivo) next.valor_efectivo = r.valor_efectivo
      if (r.valor_tarjeta) next.valor_tarjeta = r.valor_tarjeta
      // método de pago detectado por la IA (define el trato/tipo_pago)
      if (r.metodo_pago) next.metodo_pago = r.metodo_pago
      if (r.tipo_pago) next.tipo_pago = r.tipo_pago
      // % propio (trabajo compartido); si no hay reparto la IA devuelve 100
      if (r.participacion != null) next.participacion = Number(r.participacion)
      const calc = recompute(next)
      setRow(calc)
      // La IA a veces marca como "no reconocido" un método que SÍ está configurado.
      // Filtramos contra los métodos reales del técnico (case-insensitive) — fuente de verdad.
      const configSet = new Set(metodosFuente.map(m => (m.nombre || "").trim().toLowerCase()))
      const noReconocidos = (Array.isArray(r.metodos_no_reconocidos) ? r.metodos_no_reconocidos : [])
        .filter(Boolean)
        .filter(n => !configSet.has(String(n).trim().toLowerCase()))
      // flags para que el caller decida qué modal abrir
      return {
        row: calc,
        jobResuelto: !!(r.job_type && jobsDisponibles.includes(r.job_type)),
        noReconocidos,
        metodoResuelto: !!r.metodo_pago,
      }
    } catch (err) {
      console.error(err)
      setError("No se pudo interpretar el mensaje")
      return null
    }
  }

  // Crea un método de pago nuevo para el técnico y lo agrega a sus opciones.
  // Devuelve la lista de métodos ya actualizada (para re-parsear sin estado viejo).
  const crearMetodo = async ({ nombre: nombreMetodo, trato, principal = false }) => {
    try {
      const creado = await vaCrearMetodo({
        tecnico_virginia_id: tecnico.id,
        nombre: nombreMetodo.trim(),
        trato,
        principal,
      })
      const base = principal
        ? (tecnico?.metodos_pago ?? []).map(m => ({ ...m, principal: false }))
        : (tecnico?.metodos_pago ?? [])
      const nuevos = [...base, creado]
      setTecnico(prev => ({ ...prev, metodos_pago: nuevos }))
      return nuevos
    } catch (err) {
      console.error(err)
      setError("No se pudo crear el método de pago")
      return null
    }
  }

  // ── export excel ──────────────────────────────
  const exportarExcel = async () => {
    const ids = registros.filter(r => r.id_registro).map(r => r.id_registro)
    if (!ids.length) { setError("No hay registros guardados para exportar"); return }
    try {
      const res = await vaExportExcel(ids, nombre, semana)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `virginia_${nombre}_${semana}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error(err)
      setError("No se pudo exportar")
    }
  }

  const balancePartes = useMemo(() => calcularBalancePartes(partes), [partes])
  const balanceTech = useMemo(
    () => Number((registros.reduce((a, r) => a + (r.total || 0), 0) + balancePartes).toFixed(2)),
    [registros, balancePartes]
  )

  return {
    tecnico, semana, semanaFechas, registros, setRegistros, partes, rowData, loading, error, setError,
    opcionesPago, jobsDisponibles,
    cambiarCampo, agregarRegistro,
    agregarParte, eliminarParte, parsearMensaje, crearMetodo, exportarExcel,
    balancePartes, balanceTech,
  }
}
