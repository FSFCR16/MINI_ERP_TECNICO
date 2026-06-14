"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { useVirginiaTecnicos } from "./hooks/useVirginiaTecnicos"
import { tecnicoVirginiaSchema } from "./schemas/virginiaSchema"
import { ConfigJobsPanel } from "./components/ConfigJobsPanel"
import { MetodosPagoPanel } from "./components/MetodosPagoPanel"
import { vaValidarSemana } from "@/Services/virginiaServices"

const tecnicoVacio = { nombre: "", valor_adicional: 2.5 }

export default function VirginiaPage() {
  const {
    tecnicos, loading,
    seleccionado, configs, metodos, cargandoDetalle,
    crearTecnico, eliminarTecnico,
    seleccionarTecnico,
    crearConfig, eliminarConfig,
    crearMetodo, actualizarMetodo, eliminarMetodo,
  } = useVirginiaTecnicos()

  const [form, setForm] = useState({ ...tecnicoVacio })
  const [error, setError] = useState(null)
  const [yendo, setYendo] = useState(false)
  const router = useRouter()

  const irACargarRegistros = async () => {
    if (!seleccionado) return
    setYendo(true)
    try {
      const sem = await vaValidarSemana()
      router.push(`/virginia/${encodeURIComponent(seleccionado.nombre)}/${sem.semana}`)
    } catch (e) {
      setError("No se pudo abrir la semana actual")
      setYendo(false)
    }
  }

  const agregarTecnico = async () => {
    const res = tecnicoVirginiaSchema.safeParse(form)
    if (!res.success) {
      setError(res.error.issues[0]?.message || "Datos inválidos")
      return
    }
    setError(null)
    try {
      await crearTecnico(form)
      setForm({ ...tecnicoVacio })
    } catch (e) {
      setError(e?.status === 409 ? "Ya existe un técnico con ese nombre" : "No se pudo crear")
    }
  }

  const togglePrincipal = (m) => actualizarMetodo(m.id, { principal: !m.principal })

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">
      {loading && <LoadingOverlay />}
      <div className="max-w-[1100px] mx-auto flex flex-col gap-4">

        {/* HEADER */}
        <div className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-sky-100/70 border border-sky-200/60 text-sky-600 uppercase tracking-wide">
              Virginia · Técnicos
            </span>
            {tecnicos.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-600 border border-sky-200/60">
                {tecnicos.length}
              </span>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Inicio
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">

          {/* COLUMNA IZQUIERDA: lista + alta */}
          <div className="flex flex-col gap-3">
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-3 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-1">
                Técnicos
              </span>
              <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-auto custom-scroll">
                {tecnicos.length === 0 && (
                  <p className="text-xs text-slate-400 px-1 py-2">Sin técnicos todavía.</p>
                )}
                {tecnicos.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => seleccionarTecnico(t)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition border ${
                      seleccionado?.id === t.id
                        ? "bg-sky-100/70 border-sky-200/70"
                        : "bg-white/50 border-white/50 hover:bg-white/80"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">{t.nombre}</span>
                      <span className="text-[10px] text-slate-400">adic. ${t.valor_adicional}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarTecnico(t.id) }}
                      className="text-rose-400 hover:text-rose-600 cursor-pointer shrink-0"
                      title="Eliminar técnico"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* alta técnico */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-3 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-1">
                Nuevo técnico
              </span>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
                className="bg-white/60 border border-white/50 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/80"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Valor adicional</label>
                <input
                  type="number"
                  value={form.valor_adicional}
                  onChange={(e) => setForm({ ...form, valor_adicional: e.target.value })}
                  className="w-20 bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80 text-center"
                />
              </div>
              <button
                onClick={agregarTecnico}
                className="px-4 py-2 text-sm rounded-lg font-semibold bg-white/60 border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition cursor-pointer"
              >
                + Agregar técnico
              </button>
              {error && <p className="text-xs text-rose-500">{error}</p>}
            </div>
          </div>

          {/* COLUMNA DERECHA: detalle */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-4 min-h-[300px]">
            {!seleccionado ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400">Seleccioná un técnico para ver su configuración y métodos de pago.</p>
              </div>
            ) : cargandoDetalle ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400">Cargando…</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-slate-800">{seleccionado.nombre}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Valor adicional: ${seleccionado.valor_adicional}</span>
                    <button
                      onClick={irACargarRegistros}
                      disabled={yendo}
                      className="px-4 py-1.5 text-xs rounded-xl bg-sky-500 text-white font-medium shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-50"
                    >
                      {yendo ? "Abriendo…" : "Cargar registros →"}
                    </button>
                  </div>
                </div>

                <ConfigJobsPanel
                  configs={configs}
                  onCrear={crearConfig}
                  onEliminar={eliminarConfig}
                />

                <div className="border-t border-white/40" />

                <MetodosPagoPanel
                  metodos={metodos}
                  onCrear={crearMetodo}
                  onEliminar={eliminarMetodo}
                  onTogglePrincipal={togglePrincipal}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
