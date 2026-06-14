"use client"
import { useState } from "react"
import Link from "next/link"
import { TablaRegistros } from "@/app/tecnico/[nombre]/[semana]/views/Desktop/TablaRegistros.jsx"

// Vista de ESCRITORIO de Virginia. Recibe todo por props desde page.jsx
// (datos del hook useVirginiaRegistros + el motor useVirginiaTabla).
export function DesktopView({
  nombre, semanaFechas, error, setError,
  rowData, cambiarCampo, opcionesPago, jobs, esMixto,
  partes, eliminarParte, balancePartes, balanceTech,
  tabla, erroresAlta = [], tieneError = () => false,
  onAgregar, onParsear, pedirExportar,
  abrirPartes, abrirNotas, abrirHistorial,
}) {
  const [mensaje, setMensaje] = useState("")
  const [parsing, setParsing] = useState(false)
  const [msgFoco, setMsgFoco] = useState(false)

  const ejecutarParser = async () => {
    if (!mensaje.trim()) return
    setParsing(true)
    await onParsear(mensaje)
    setParsing(false)
  }
  const errCls = (key) => tieneError(key) ? " border-rose-400 bg-rose-50/50" : ""

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-4">

        {/* HEADER */}
        <div className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-sky-100/70 border border-sky-200/60 text-sky-600 uppercase tracking-wide">
              Virginia · {nombre}
            </span>
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">Semana</span>
            <span className="text-sm text-slate-600">
              {semanaFechas.inicio} / {semanaFechas.fin} {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Edición */}
            <div className="flex items-center gap-0.5 bg-white/40 rounded-xl p-0.5 border border-white/50">
              <HBtn onClick={tabla.deshacer} disabled={!tabla.puedeDeshacer} title="Deshacer (Ctrl+Z)">↶</HBtn>
              <HBtn onClick={tabla.rehacer} disabled={!tabla.puedeRehacer} title="Rehacer (Ctrl+Y)">↷</HBtn>
            </div>

            {/* Utilidades */}
            <div className="flex items-center gap-0.5 bg-white/40 rounded-xl p-0.5 border border-white/50">
              <HBtn onClick={abrirHistorial} title="Historial" tono="amber">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </HBtn>
              <HBtn onClick={abrirNotas} title="Notas" tono="amber">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </HBtn>
            </div>

            {/* Acciones principales */}
            <button onClick={tabla.guardar} disabled={!tabla.hayPendientes || tabla.guardando} title="Guardar (Ctrl+S)" className="px-3 py-1.5 text-xs rounded-xl bg-sky-500 text-white font-medium shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {tabla.guardando ? "Guardando…" : tabla.hayPendientes ? "Guardar •" : "Guardar"}
            </button>
            <button onClick={pedirExportar} title="Exportar Excel" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-green-500 text-white font-medium shadow-sm hover:opacity-90 active:scale-95 transition cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 6H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
            <Link href="/virginia" title="Volver a técnicos" className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-slate-500 shadow-sm hover:bg-white/70 active:scale-95 transition cursor-pointer">
              ←
            </Link>
          </div>
        </div>

        {/* PARSER IA */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-3 flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pegar ticket (IA)</span>
          <div className="flex gap-2">
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} onFocus={() => setMsgFoco(true)} onBlur={() => setMsgFoco(false)} placeholder="Pegá el mensaje del ticket…" rows={msgFoco || mensaje ? 10 : 2} className="flex-1 bg-white/60 border border-white/50 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/80 resize-y transition-all duration-200" />
            <button onClick={ejecutarParser} disabled={parsing} className="px-4 py-2 text-sm rounded-lg font-medium bg-white/60 border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition cursor-pointer disabled:opacity-50">
              {parsing ? "…" : "Interpretar"}
            </button>
          </div>
        </div>

        {/* FORM ALTA */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-3 flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nuevo registro</span>
          <div className="flex flex-wrap items-end gap-2">
            <Campo label="Job">
              <select value={rowData.job} onChange={(e) => cambiarCampo("job", e.target.value)} className={inputCls + errCls("job")}>
                <option value="">—</option>
                {jobs.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </Campo>
            <Campo label="ID Job">
              <input value={rowData.job_name} onChange={(e) => cambiarCampo("job_name", e.target.value)} className={`${inputCls} w-28${errCls("job_name")}`} />
            </Campo>
            <Campo label="Valor servicio">
              <input type="number" value={rowData.valor_servicio || ""} onChange={(e) => cambiarCampo("valor_servicio", Number(e.target.value))} className={`${inputCls} w-24${errCls("valor_servicio")}`} />
            </Campo>
            <Campo label="Método de pago">
              <select value={rowData.metodo_pago} onChange={(e) => cambiarCampo("metodo_pago", e.target.value)} className={inputCls + errCls("metodo_pago")}>
                <option value="">—</option>
                {opcionesPago.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Campo>
            {esMixto && (
              <>
                <Campo label="Efectivo">
                  <input type="number" value={rowData.valor_efectivo || ""} onChange={(e) => cambiarCampo("valor_efectivo", Number(e.target.value))} className={`${inputCls} w-20`} />
                </Campo>
                <Campo label="Tarjeta">
                  <input type="number" value={rowData.valor_tarjeta || ""} onChange={(e) => cambiarCampo("valor_tarjeta", Number(e.target.value))} className={`${inputCls} w-20`} />
                </Campo>
              </>
            )}
            <Campo label="% Téc">
              <span className="text-sm text-slate-500 px-2 py-1.5">{rowData.porcentaje_tecnico}</span>
            </Campo>
            <Campo label="% Propio">
              <input type="number" min={1} max={100} value={rowData.participacion ?? 100} onChange={(e) => cambiarCampo("participacion", Number(e.target.value))} className={`${inputCls} w-20`} title="Trabajo compartido: % del job que le toca a este técnico" />
            </Campo>
            <Campo label="Total">
              <span className={`text-sm font-semibold px-2 py-1.5 ${rowData.total < 0 ? "text-rose-600" : "text-green-600"}`}>{rowData.total}</span>
            </Campo>
            <button onClick={onAgregar} className="px-4 py-2 text-sm rounded-lg font-semibold bg-white/60 border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition cursor-pointer">
              + Agregar
            </button>
          </div>
          {erroresAlta.length > 0 && (
            <p className="text-xs text-rose-500">{erroresAlta.map(e => `${e.label}: ${e.message}`).join(" · ")}</p>
          )}
          {error && <p className="text-xs text-rose-500">{error} <button onClick={() => setError(null)} className="underline">cerrar</button></p>}
        </div>

        {/* TABLA REGISTROS — editable, copiar/pegar, selección múltiple */}
        <div className="flex flex-col h-[50vh]">
          <TablaRegistros state={tabla.state} handlers={tabla.handlers} nav={tabla.nav} />
        </div>

        {/* PARTES + BALANCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Partes</span>
              <button onClick={abrirPartes} className="px-3 py-1 text-xs rounded-lg bg-white/60 border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition cursor-pointer">
                + Agregar partes
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {partes.length === 0 && <p className="text-xs text-slate-400">Sin partes esta semana.</p>}
              {partes.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/60 border border-white/50 text-sm">
                  <span className="text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">${((p.valor || 0) * (p.porcentaje_tecnico || 0) / 100).toFixed(2)}</span>
                    <button onClick={() => eliminarParte(p.id)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {partes.length > 0 && (
                <div className="text-xs text-slate-500 pt-1">Balance partes: <span className="font-semibold">${balancePartes}</span></div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-5 flex flex-col items-center justify-center text-white">
            <span className="text-xs uppercase tracking-widest opacity-80">Balanced Tech</span>
            <span className="text-4xl font-bold mt-1">${balanceTech}</span>
            <span className="text-[11px] opacity-80 mt-1">registros + partes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = "bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80"

function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-slate-400 uppercase">{label}</label>
      {children}
    </div>
  )
}

function HBtn({ children, onClick, disabled, title, tono = "slate" }) {
  const color = tono === "amber" ? "text-amber-600" : "text-slate-600"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg ${color} text-sm hover:bg-white/70 active:scale-95 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
