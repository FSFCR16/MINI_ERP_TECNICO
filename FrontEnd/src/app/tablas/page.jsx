"use client"
// Dashboard unificado (general + Virginia) con dos vistas:
//   • Por semana: elegís una semana y ves sus técnicos (como antes).
//   • Por técnico: lista única buscable con badge de módulo.
// Cada card tiene menú (⋯) para Exportar y Eliminar, en ambos módulos.
import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import {
  traerHistorialTodos, getRegistrosPrevios, exportarExcelDBPost, eliminarTecnicoSemana,
} from "../../Services/tencicosServices.js"
import {
  vaHistorialTodos, vaObtenerRegistros, vaExportExcel, vaEliminarTecnicoSemana,
} from "@/Services/virginiaServices"
import { formatearFechaSemana } from "@/Utils/api.js"
import { AgregarTecnicoModal } from "./components/AgregarTecnicoModal.jsx"

const fmtMonto = (n) => `$${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
const claveItem = (it) => `${it.mod}-${it.semana_id}-${it.nombre}`

async function descargar(response, filename) {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function TablasPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [vista, setVista] = useState("semana")   // "semana" | "tecnico"
  const [filtro, setFiltro] = useState("todos")   // todos | gen | vir
  const [busqueda, setBusqueda] = useState("")
  const [semanaSel, setSemanaSel] = useState(null)
  const [modal, setModal] = useState(null)        // null | { semana?: string }
  const [menuKey, setMenuKey] = useState(null)     // clave de la fila con menú ⋯ abierto (única)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const [gen, vir] = await Promise.all([
          traerHistorialTodos().catch(() => []),
          vaHistorialTodos().catch(() => []),
        ])
        const merge = [
          ...(gen ?? []).map((e) => ({ ...e, mod: "gen" })),
          ...(vir ?? []).map((e) => ({ ...e, mod: "vir" })),
        ].sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))
        setItems(merge)
      } catch (e) {
        console.error(e)
        setError("No se pudo cargar el historial")
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  // semanas (derivadas de items, fusionando ambos módulos por etiqueta de semana)
  const semanas = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      if (!map.has(it.semana)) {
        map.set(it.semana, { semana: it.semana, fecha_inicio: it.fecha_inicio, fecha_fin: it.fecha_fin, gen: 0, vir: 0 })
      }
      const e = map.get(it.semana)
      if (it.mod === "gen") e.gen++; else e.vir++
    }
    return [...map.values()].sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))
  }, [items])

  const base = useMemo(() => {
    if (vista === "semana") return semanaSel ? items.filter((it) => it.semana === semanaSel) : []
    return items
  }, [vista, semanaSel, items])

  const lista = useMemo(() => {
    const palabras = busqueda.toLowerCase().trim().split(/\s+/).filter(Boolean)
    return base.filter((it) => {
      if (filtro !== "todos" && it.mod !== filtro) return false
      if (palabras.length === 0) return true
      const txt = `${it.nombre} ${it.semana} ${it.fecha_inicio} ${it.fecha_fin}`.toLowerCase()
      return palabras.every((p) => txt.includes(p))
    })
  }, [base, filtro, busqueda])

  const conteo = useMemo(() => ({
    todos: base.length,
    gen: base.filter((i) => i.mod === "gen").length,
    vir: base.filter((i) => i.mod === "vir").length,
  }), [base])

  const irA = (it) => {
    const ruta = it.mod === "vir"
      ? `/virginia/${encodeURIComponent(it.nombre)}/${it.semana}`
      : `/tecnico/${encodeURIComponent(it.nombre)}/${it.semana}`
    router.push(ruta)
  }

  const exportar = async (it) => {
    setBusy(true)
    try {
      if (it.mod === "vir") {
        const regs = await vaObtenerRegistros(it.nombre, it.semana).catch(() => [])
        const ids = (regs ?? []).map((r) => r.id).filter(Boolean)
        if (!ids.length) { setError("Sin registros para exportar"); return }
        const res = await vaExportExcel(ids, it.nombre, it.semana)
        await descargar(res, `virginia_${it.nombre}_${it.semana}.xlsx`)
      } else {
        const regs = await getRegistrosPrevios(it.nombre, it.semana).catch(() => [])
        if (!regs?.length) { setError("Sin registros para exportar"); return }
        const payload = regs.map((r) => ({
          id: String(r.id), id_registro: r.id, id_tecnico: r.tecnico_id, nombre: r.nombre,
          job: r.job ?? "", job_name: r.job_name ?? "", valor_servicio: r.valor_servicio ?? 0,
          porcentaje_tecnico: r.porcentaje_tecnico ?? 0, minimo: 0, opciones_pago: [],
          tipo_pago: r.tipo_pago ?? "CASH", valor_tarjeta: r.valor_tarjeta ?? 0, valor_efectivo: r.valor_efectivo ?? 0,
          porcentaje_cc: r.porcentaje_cc ?? 0, partes_gil: r.partes_gil ?? 0, partes_tecnico: r.partes_tecnico ?? 0,
          tech: r.tech ?? 0, subtotal: r.subtotal ?? 0, total: r.total ?? 0, adicional_dolar: 0, notas: [],
        }))
        const res = await exportarExcelDBPost(payload, it.nombre, it.semana)
        await descargar(res, `TECNICO_${it.nombre}_${formatearFechaSemana(it.fecha_inicio)}_${formatearFechaSemana(it.fecha_fin)}.xlsx`)
      }
    } catch (e) {
      console.error(e); setError("No se pudo exportar")
    } finally { setBusy(false) }
  }

  const eliminar = async (it) => {
    setBusy(true)
    try {
      if (it.mod === "vir") await vaEliminarTecnicoSemana(it.nombre, it.semana_id)
      else await eliminarTecnicoSemana(it.nombre, it.semana_id)
      setItems((prev) => prev.filter((x) => claveItem(x) !== claveItem(it)))
    } catch (e) {
      console.error(e); setError("No se pudo eliminar")
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-200 px-4 py-8">
      {(loading || busy) && <LoadingOverlay />}
      <div className="max-w-3xl mx-auto flex flex-col gap-4">

        {/* HEADER + toggle de vista */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-800">Tablas</h1>
            <div className="inline-flex bg-white/50 rounded-xl p-1 border border-white/50">
              {[["semana", "Por semana"], ["tecnico", "Por técnico"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => { setVista(k); setBusqueda(""); setFiltro("todos"); setSemanaSel(null) }}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${vista === k ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 hover:bg-white/60"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({})}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-sky-500 text-white font-medium shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              + Nuevo
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/80 active:scale-95 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Inicio
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-500 text-center">
            {error} <button onClick={() => setError(null)} className="underline ml-1">cerrar</button>
          </p>
        )}

        {/* ── VISTA POR SEMANA: lista de semanas ── */}
        {vista === "semana" && !semanaSel && (
          <div className="flex flex-col gap-3">
            {!loading && semanas.length === 0 && <Vacio texto="No hay semanas" />}
            {semanas.map((s) => (
              <button
                key={s.semana}
                onClick={() => { setSemanaSel(s.semana); setBusqueda(""); setFiltro("todos") }}
                className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-md px-4 py-3 flex items-center justify-between hover:bg-white/90 active:scale-[0.99] transition text-left cursor-pointer"
              >
                <span className="text-sm font-semibold text-slate-800">{formatearFechaSemana(s.fecha_inicio)} / {formatearFechaSemana(s.fecha_fin)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs">
                    <span className="text-sky-600 font-medium">Gen: {s.gen}</span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="text-indigo-600 font-medium">Vir: {s.vir}</span>
                  </span>
                  <span className="text-slate-300">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Barra de filtros/búsqueda (lista de técnicos) ── */}
        {(vista === "tecnico" || (vista === "semana" && semanaSel)) && (
          <>
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-2 flex items-center gap-2 flex-wrap">
              {vista === "semana" && (
                <button onClick={() => setSemanaSel(null)} className="px-3 py-1.5 text-xs rounded-xl bg-white/50 border border-white/50 text-slate-500 hover:bg-white/80 cursor-pointer">← Semanas</button>
              )}
              {[["todos", "Todos", conteo.todos], ["gen", "General", conteo.gen], ["vir", "Virginia", conteo.vir]].map(([k, label, n]) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${filtro === k ? "bg-sky-500 text-white shadow-sm" : "bg-white/50 border border-white/50 text-slate-600 hover:bg-white/80"}`}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filtro === k ? "bg-white/25" : "bg-slate-200/70 text-slate-500"}`}>{n}</span>
                </button>
              ))}
              <div className="flex-1 min-w-[140px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50">
                <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar técnico..." className="flex-1 bg-transparent text-sm text-slate-600 placeholder-slate-300 outline-none min-w-0" />
              </div>
            </div>

            {!loading && lista.length === 0 && <Vacio texto="No se encontraron técnicos" />}

            <div className="flex flex-col gap-2.5">
              {lista.map((it) => (
                <TecnicoRow
                  key={claveItem(it)}
                  it={it}
                  mostrarSemana={vista === "tecnico"}
                  abierto={menuKey === claveItem(it)}
                  onMenu={() => setMenuKey((k) => (k === claveItem(it) ? null : claveItem(it)))}
                  onCerrarMenu={() => setMenuKey(null)}
                  onVer={() => irA(it)}
                  onExportar={() => exportar(it)}
                  onEliminar={() => eliminar(it)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {modal && (
        <AgregarTecnicoModal
          semana={modal.semana ?? null}
          rango={modal.semana ? (() => {
            const s = semanas.find((x) => x.semana === modal.semana)
            return s ? `${formatearFechaSemana(s.fecha_inicio)} / ${formatearFechaSemana(s.fecha_fin)}` : ""
          })() : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function Vacio({ texto }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-6 py-10 text-center">
      <p className="text-sm text-slate-400">{texto}</p>
    </div>
  )
}

function TecnicoRow({ it, mostrarSemana, abierto, onMenu, onCerrarMenu, onVer, onExportar, onEliminar }) {
  const [confirmar, setConfirmar] = useState(false)
  const menuRef = useRef(null)

  // al cerrarse el menú, resetea la confirmación de borrado
  useEffect(() => { if (!abierto) setConfirmar(false) }, [abierto])

  // cierre al clicar/tocar fuera del menú (un overlay con backdrop-blur no sirve:
  // backdrop-filter contiene a los hijos position:fixed, así que no cubre la pantalla)
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onCerrarMenu() }
    document.addEventListener("mousedown", fuera)
    document.addEventListener("touchstart", fuera)
    return () => {
      document.removeEventListener("mousedown", fuera)
      document.removeEventListener("touchstart", fuera)
    }
  }, [abierto, onCerrarMenu])

  return (
    <div className={`bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-md px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/90 transition relative ${abierto ? "z-50" : ""}`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${it.mod === "gen" ? "bg-sky-500" : "bg-indigo-500"}`} />
        <span className="text-sm font-semibold text-slate-700 truncate">{it.nombre}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${it.mod === "gen" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"}`}>
          {it.mod === "gen" ? "General" : "Virginia"}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex flex-col items-end">
          {mostrarSemana && <span className="text-xs text-slate-500">{formatearFechaSemana(it.fecha_inicio)} / {formatearFechaSemana(it.fecha_fin)}</span>}
          <span className="text-[10px] text-slate-400">{it.total_registros} reg</span>
        </div>
        <span className={`text-sm font-semibold ${Number(it.total) < 0 ? "text-rose-600" : "text-green-600"}`}>{fmtMonto(it.total)}</span>

        {/* Botón Ver (único acceso al técnico — minimalista glass con ícono de ojo) */}
        <button onClick={onVer} title="Ver registros" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/40 backdrop-blur border border-white/50 text-slate-600 font-medium shadow-sm hover:bg-white/70 hover:text-slate-800 active:scale-95 transition cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver
        </button>

        {/* menú ⋯ */}
        <div className="relative" ref={menuRef}>
          <button onClick={onMenu} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/70 hover:text-slate-600 cursor-pointer" title="Acciones">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          {abierto && (
            <>
              <div className="absolute right-0 top-8 z-50 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-2xl py-1 min-w-[150px] overflow-hidden">
                <button onClick={() => { onCerrarMenu(); onExportar() }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-sky-50 cursor-pointer">
                  <span className="text-green-600">⬇</span> Exportar Excel
                </button>
                {!confirmar ? (
                  <button onClick={() => setConfirmar(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-rose-500 hover:bg-rose-50 cursor-pointer">
                    <span>✕</span> Eliminar
                  </button>
                ) : (
                  <div className="px-3 py-2 flex items-center justify-between gap-2 bg-rose-50/60">
                    <span className="text-[11px] text-slate-600">¿Seguro?</span>
                    <div className="flex gap-1">
                      <button onClick={() => { onCerrarMenu(); onEliminar() }} className="text-[11px] font-semibold text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-100 cursor-pointer">Sí</button>
                      <button onClick={() => setConfirmar(false)} className="text-[11px] text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer">No</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
