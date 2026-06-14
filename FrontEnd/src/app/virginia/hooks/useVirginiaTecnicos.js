import { useState, useEffect, useCallback } from "react"
import {
  vaObtenerTecnicos, vaCrearTecnico, vaActualizarTecnico, vaEliminarTecnico,
  vaObtenerConfig, vaCrearConfig, vaActualizarConfig, vaEliminarConfig,
  vaObtenerMetodos, vaCrearMetodo, vaActualizarMetodo, vaEliminarMetodo,
} from "@/Services/virginiaServices"

export function useVirginiaTecnicos() {
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null) // técnico-persona
  const [configs, setConfigs] = useState([])
  const [metodos, setMetodos] = useState([])
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // ── Técnicos ──────────────────────────────────
  const cargarTecnicos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await vaObtenerTecnicos()
      setTecnicos(data)
    } catch (err) {
      console.error("Error cargando técnicos Virginia:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarTecnicos() }, [cargarTecnicos])

  const crearTecnico = async (payload) => {
    const creado = await vaCrearTecnico({
      nombre: payload.nombre.trim().toUpperCase(),
      valor_adicional: Number(payload.valor_adicional),
    })
    setTecnicos(prev => [...prev, creado].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")))
    return creado
  }

  const actualizarTecnico = async (id, data) => {
    const actualizado = await vaActualizarTecnico(id, data)
    setTecnicos(prev => prev.map(t => (t.id === id ? actualizado : t)))
    if (seleccionado?.id === id) setSeleccionado(actualizado)
    return actualizado
  }

  const eliminarTecnico = async (id) => {
    setTecnicos(prev => prev.filter(t => t.id !== id))
    if (seleccionado?.id === id) limpiarSeleccion()
    try {
      await vaEliminarTecnico(id)
    } catch (err) {
      console.error("Error eliminando técnico:", err)
      cargarTecnicos()
    }
  }

  // ── Detalle (config + métodos) ────────────────
  const seleccionarTecnico = async (tecnico) => {
    if (seleccionado?.id === tecnico.id) { limpiarSeleccion(); return }
    setSeleccionado(tecnico)
    setCargandoDetalle(true)
    try {
      const [cfg, met] = await Promise.all([
        vaObtenerConfig(tecnico.id),
        vaObtenerMetodos(tecnico.id),
      ])
      setConfigs(cfg)
      setMetodos(met)
    } catch (err) {
      console.error("Error cargando detalle:", err)
    } finally {
      setCargandoDetalle(false)
    }
  }

  const limpiarSeleccion = () => {
    setSeleccionado(null)
    setConfigs([])
    setMetodos([])
  }

  // ── Config por job ────────────────────────────
  const crearConfig = async (payload) => {
    const creado = await vaCrearConfig({ ...payload, tecnico_virginia_id: seleccionado.id })
    setConfigs(prev => [...prev, creado])
    return creado
  }

  const actualizarConfig = async (id, data) => {
    const actualizado = await vaActualizarConfig(id, data)
    setConfigs(prev => prev.map(c => (c.id === id ? actualizado : c)))
    return actualizado
  }

  const eliminarConfig = async (id) => {
    setConfigs(prev => prev.filter(c => c.id !== id))
    try { await vaEliminarConfig(id) } catch (err) { console.error(err) }
  }

  // ── Métodos de pago ───────────────────────────
  const crearMetodo = async (payload) => {
    const creado = await vaCrearMetodo({ ...payload, tecnico_virginia_id: seleccionado.id })
    setMetodos(prev => {
      const next = payload.principal ? prev.map(m => ({ ...m, principal: false })) : prev
      return [...next, creado]
    })
    return creado
  }

  const actualizarMetodo = async (id, data) => {
    const actualizado = await vaActualizarMetodo(id, data)
    setMetodos(prev => {
      let next = prev
      if (data.principal === true) next = next.map(m => ({ ...m, principal: false }))
      return next.map(m => (m.id === id ? actualizado : m))
    })
    return actualizado
  }

  const eliminarMetodo = async (id) => {
    setMetodos(prev => prev.filter(m => m.id !== id))
    try { await vaEliminarMetodo(id) } catch (err) { console.error(err) }
  }

  return {
    tecnicos, loading,
    seleccionado, configs, metodos, cargandoDetalle,
    crearTecnico, actualizarTecnico, eliminarTecnico,
    seleccionarTecnico, limpiarSeleccion,
    crearConfig, actualizarConfig, eliminarConfig,
    crearMetodo, actualizarMetodo, eliminarMetodo,
  }
}
