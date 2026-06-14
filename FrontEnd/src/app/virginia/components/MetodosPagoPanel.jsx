"use client"
import { useState } from "react"
import { metodoPagoVirginiaSchema } from "../schemas/virginiaSchema"

const vacio = { nombre: "", trato: "CASH", principal: false }

export function MetodosPagoPanel({ metodos, onCrear, onEliminar, onTogglePrincipal }) {
  const [form, setForm] = useState({ ...vacio })
  const [error, setError] = useState(null)

  const agregar = async () => {
    const res = metodoPagoVirginiaSchema.safeParse(form)
    if (!res.success) {
      setError(res.error.issues[0]?.message || "Datos inválidos")
      return
    }
    setError(null)
    try {
      await onCrear({ ...form, nombre: form.nombre.trim() })
      setForm({ ...vacio })
    } catch (e) {
      setError("No se pudo crear el método")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        Métodos de pago
      </span>

      {/* lista */}
      <div className="flex flex-col gap-2">
        {metodos.length === 0 && (
          <p className="text-xs text-slate-400">Sin métodos. Agregá uno abajo.</p>
        )}
        {metodos.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/60 border border-white/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-slate-700 truncate">{m.nombre}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  m.trato === "CASH"
                    ? "bg-green-100/80 text-green-700 border-green-200/60"
                    : "bg-rose-100/80 text-rose-700 border-rose-200/60"
                }`}
              >
                {m.trato}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onTogglePrincipal(m)}
                title="Marcar como principal"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                  m.principal
                    ? "bg-indigo-100/80 text-indigo-700 border-indigo-200/60"
                    : "bg-white/50 text-slate-400 border-white/50 hover:bg-white/80"
                }`}
              >
                {m.principal ? "★ Principal" : "☆ Principal"}
              </button>
              <button
                onClick={() => onEliminar(m.id)}
                className="text-rose-400 hover:text-rose-600 cursor-pointer"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* form agregar */}
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Zelle"
            className="w-32 bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Trato</label>
          <select
            value={form.trato}
            onChange={(e) => setForm({ ...form, trato: e.target.value })}
            className="bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80"
          >
            <option value="CASH">CASH</option>
            <option value="CC">CC</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-1.5">
          <input
            type="checkbox"
            checked={form.principal}
            onChange={(e) => setForm({ ...form, principal: e.target.checked })}
            className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
          />
          Principal
        </label>
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
