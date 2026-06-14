"use client"
import { useState } from "react"
import { configVirginiaSchema, JOBS_VIRGINIA } from "../schemas/virginiaSchema"

const vacio = {
  job: "LOCKOUT",
  porcentaje_tecnico: 60,
  minimo: 30,
  cargo_sabados: 0,
  porcentaje_adicional_empresa: 0,
}

export function ConfigJobsPanel({ configs, onCrear, onEliminar }) {
  const [form, setForm] = useState({ ...vacio })
  const [error, setError] = useState(null)

  const agregar = async () => {
    const res = configVirginiaSchema.safeParse(form)
    if (!res.success) {
      setError(res.error.issues[0]?.message || "Datos inválidos")
      return
    }
    setError(null)
    try {
      await onCrear({
        job: form.job,
        porcentaje_tecnico: Number(form.porcentaje_tecnico),
        minimo: Number(form.minimo),
        cargo_sabados: Number(form.cargo_sabados),
        porcentaje_adicional_empresa: Number(form.porcentaje_adicional_empresa),
      })
      setForm({ ...vacio })
    } catch (e) {
      setError("No se pudo crear la config (¿ya existe ese job?)")
    }
  }

  const set = (k, v) => setForm({ ...form, [k]: v })

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        Configuración por job
      </span>

      <div className="overflow-auto custom-scroll rounded-xl border border-white/40 bg-white/50">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-white/60 text-slate-600">
            <tr className="text-[10px] uppercase">
              <th className="px-2 py-1.5 text-left">Job</th>
              <th className="px-2 py-1.5">% Téc</th>
              <th className="px-2 py-1.5">% Gil</th>
              <th className="px-2 py-1.5">Mín</th>
              <th className="px-2 py-1.5">% Sáb</th>
              <th className="px-2 py-1.5">% Emp</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-center text-xs text-slate-400">
                  Sin configuración. Agregá un job abajo.
                </td>
              </tr>
            )}
            {configs.map((c) => (
              <tr key={c.id} className="border-t border-white/40 text-center">
                <td className="px-2 py-1.5 text-left font-medium text-slate-700">{c.job}</td>
                <td className="px-2 py-1.5">{c.porcentaje_tecnico}</td>
                <td className="px-2 py-1.5 text-slate-400">{c.porcentaje_gil}</td>
                <td className="px-2 py-1.5">{c.minimo}</td>
                <td className="px-2 py-1.5">{c.cargo_sabados}</td>
                <td className="px-2 py-1.5">{c.porcentaje_adicional_empresa}</td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => onEliminar(c.id)}
                    className="text-rose-400 hover:text-rose-600 cursor-pointer"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* form agregar */}
      <div className="flex flex-wrap items-end gap-2">
        <Campo label="Job">
          <select
            value={form.job}
            onChange={(e) => set("job", e.target.value)}
            className="bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80"
          >
            {JOBS_VIRGINIA.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </Campo>
        <Campo label="% Téc"><NumInput v={form.porcentaje_tecnico} on={(v) => set("porcentaje_tecnico", v)} /></Campo>
        <Campo label="Mín"><NumInput v={form.minimo} on={(v) => set("minimo", v)} /></Campo>
        <Campo label="% Sáb"><NumInput v={form.cargo_sabados} on={(v) => set("cargo_sabados", v)} /></Campo>
        <Campo label="% Emp"><NumInput v={form.porcentaje_adicional_empresa} on={(v) => set("porcentaje_adicional_empresa", v)} /></Campo>
        <button
          onClick={agregar}
          className="px-4 py-1.5 text-sm rounded-lg font-medium bg-white/60 border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition cursor-pointer"
        >
          + Agregar
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-slate-400 uppercase">{label}</label>
      {children}
    </div>
  )
}

function NumInput({ v, on }) {
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => on(e.target.value)}
      className="w-16 bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80 text-center"
    />
  )
}
