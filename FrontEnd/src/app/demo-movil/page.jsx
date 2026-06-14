"use client"
// 🧪 PROTOTIPO VISUAL — vista móvil de Virginia (3 direcciones de diseño).
// Ruta aislada en /demo-movil. Datos de ejemplo, sin backend ni lógica real.
// Sirve solo para elegir el diseño; cuando se apruebe, se implementa de verdad.
import { useState } from "react"

// ── Datos de ejemplo ──────────────────────────────
const NOMBRE = "NICK"
const SEMANA = "08-JUNIO / 14-JUNIO"
const REGISTROS = [
  { id: 1, job: "LOCKOUT", job_name: "A123", valor_servicio: 120, metodo_pago: "Cash", tipo_pago: "CASH", valor_efectivo: 120, valor_tarjeta: 0, porcentaje_tecnico: 70, total: 84 },
  { id: 2, job: "CAR KEY", job_name: "B900", valor_servicio: 300, metodo_pago: "Visa", tipo_pago: "CC", valor_efectivo: 0, valor_tarjeta: 300, porcentaje_tecnico: 70, total: -45 },
  { id: 3, job: "PVT JOBS", job_name: "C551", valor_servicio: 200, metodo_pago: "Zelle", tipo_pago: "MIXTO", valor_efectivo: 100, valor_tarjeta: 100, porcentaje_tecnico: 65, total: 60 },
  { id: 4, job: "LOCKOUT", job_name: "D777", valor_servicio: 90, metodo_pago: "Cash", tipo_pago: "CASH", valor_efectivo: 90, valor_tarjeta: 0, porcentaje_tecnico: 70, total: 63 },
]
const PARTES = [
  { id: 1, job: "CAR KEY", valor: 40, porcentaje_tecnico: 70 },
  { id: 2, job: "LOCKOUT", valor: 20, porcentaje_tecnico: 70 },
]
const BALANCE = 1790.05
const JOBS = ["LOCKOUT", "CAR KEY", "PVT JOBS", "TODO"]
const METODOS = ["Cash", "Zelle", "Visa", "Mastercard"]

// ── Helpers visuales ──────────────────────────────
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
const jobIcon = (job) => ({ "LOCKOUT": "🔑", "CAR KEY": "🚗", "PVT JOBS": "🔧" }[job] || "🧰")

function TipoBadge({ tipo }) {
  const map = {
    CASH: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CC: "bg-rose-100 text-rose-700 border-rose-200",
    MIXTO: "bg-amber-100 text-amber-700 border-amber-200",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[tipo] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{tipo}</span>
}

function TotalPill({ total }) {
  const neg = total < 0
  return (
    <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${neg ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
      {money(total)}
    </span>
  )
}

// ══════════════════════════════════════════════════
//  PÁGINA: marco de celular + toggle de diseño
// ══════════════════════════════════════════════════
export default function DemoMovil() {
  const [dir, setDir] = useState("B")
  const opciones = [
    ["A", "App + bottom sheet"],
    ["B", "Acordeón"],
    ["C", "Pestañas"],
  ]

  return (
    <div className="min-h-screen w-full bg-slate-200 flex flex-col items-center gap-6 py-8 px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-700">Prototipo móvil · Virginia</h1>
        <p className="text-xs text-slate-500 mt-0.5">Cambiá entre las 3 direcciones de diseño</p>
      </div>

      {/* Toggle de dirección */}
      <div className="inline-flex bg-white rounded-2xl p-1 border border-slate-300 shadow-sm">
        {opciones.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setDir(k)}
            className={`px-4 py-2 text-xs rounded-xl font-medium transition cursor-pointer ${dir === k ? "bg-sky-500 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {k}) {l}
          </button>
        ))}
      </div>

      {/* Marco de celular */}
      <div className="relative w-[390px] h-[800px] bg-black rounded-[44px] p-3 shadow-2xl shrink-0">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-30" />
        <div className="w-full h-full rounded-[34px] overflow-hidden bg-white relative">
          {dir === "A" && <DiseñoA />}
          {dir === "B" && <DiseñoB />}
          {dir === "C" && <DiseñoC />}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  A) App-like + bottom sheet
// ══════════════════════════════════════════════════
function DiseñoA() {
  const [sel, setSel] = useState(null)
  const [q, setQ] = useState("")
  const lista = REGISTROS.filter(r => `${r.job} ${r.job_name}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-slate-500">‹</button>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">{NOMBRE}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Semana {SEMANA}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn>⟲</IconBtn><IconBtn>⟳</IconBtn><IconBtn>⋯</IconBtn>
        </div>
      </div>

      {/* Hero Balanced */}
      <div className="px-4">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          <p className="text-[11px] uppercase tracking-widest opacity-80">Balanced Tech</p>
          <p className="text-4xl font-extrabold mt-1">{money(BALANCE)}</p>
          <p className="text-[11px] opacity-80 mt-1">{REGISTROS.length} registros · {PARTES.length} partes</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 bg-white/80 border border-white/70 rounded-2xl px-3 py-2.5 shadow-sm">
          <span className="text-slate-400">🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar registro…" className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
        </div>
      </div>

      {/* Lista de cards */}
      <div className="flex-1 overflow-auto px-4 mt-3 pb-28 flex flex-col gap-2.5">
        {lista.map(r => (
          <button key={r.id} onClick={() => setSel(r)} className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.99] transition text-left">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-xl shrink-0">{jobIcon(r.job)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{r.job}</span>
                <span className="text-[11px] text-slate-400">#{r.job_name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{money(r.valor_servicio)}</span>
                <TipoBadge tipo={r.tipo_pago} />
              </div>
            </div>
            <TotalPill total={r.total} />
          </button>
        ))}
      </div>

      {/* FAB */}
      <button className="absolute right-5 bottom-24 w-14 h-14 rounded-full bg-sky-500 text-white text-3xl shadow-xl flex items-center justify-center active:scale-95 transition">+</button>

      {/* Barra inferior guardar */}
      <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 py-3 flex gap-2">
        <button className="flex-1 py-2.5 rounded-2xl bg-sky-500 text-white text-sm font-semibold shadow">Guardar •</button>
        <button className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium">Revertir</button>
      </div>

      {/* Bottom sheet de edición */}
      {sel && (
        <div className="absolute inset-0 z-20 flex items-end" onClick={() => setSel(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3 animate-none" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-xl">{jobIcon(sel.job)}</div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-800">{sel.job} <span className="text-xs text-slate-400">#{sel.job_name}</span></p>
                <TipoBadge tipo={sel.tipo_pago} />
              </div>
              <TotalPill total={sel.total} />
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <Field label="ID Job" value={sel.job_name} />
              <Field label="Sales" value={`$${sel.valor_servicio}`} />
              <Field label="Tipo" value={sel.tipo_pago} />
              <Field label="% Téc" value={`${sel.porcentaje_tecnico}%`} />
              {sel.tipo_pago === "MIXTO" && <>
                <Field label="Efectivo" value={`$${sel.valor_efectivo}`} />
                <Field label="Tarjeta" value={`$${sel.valor_tarjeta}`} />
              </>}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setSel(null)} className="flex-1 py-2.5 rounded-2xl bg-sky-500 text-white text-sm font-semibold">Guardar cambios</button>
              <button className="px-4 py-2.5 rounded-2xl bg-rose-50 text-rose-500 text-sm font-medium">🗑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
//  B) Acordeón de secciones
// ══════════════════════════════════════════════════
function DiseñoB() {
  const [tab, setTab] = useState("registros")
  const [abierto, setAbierto] = useState({ form: true, registros: true, ia: false, partes: false })
  const [expand, setExpand] = useState(null)
  const toggle = (k) => setAbierto(p => ({ ...p, [k]: !p[k] }))

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-white/70 backdrop-blur-xl border-b border-white/60 z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">{NOMBRE} <span className="text-[10px] font-normal text-slate-500">· {SEMANA}</span></p>
          <div className="flex items-center gap-1.5">
            <IconBtn>⟲</IconBtn><IconBtn>⟳</IconBtn>
            <button className="px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-semibold">Guardar •</button>
          </div>
        </div>
      </div>

      {/* Contenido por pestaña */}
      <div className="flex-1 overflow-auto pb-24">
        {tab === "registros" && (
          <div className="flex flex-col gap-3 p-4">
            <Seccion titulo="Pegar ticket (IA)" abierto={abierto.ia} onToggle={() => toggle("ia")}>
              <textarea rows={2} placeholder="Pegá el mensaje…" className="w-full bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              <button className="self-end px-4 py-1.5 rounded-xl bg-white/70 border border-white/60 text-sky-600 text-xs font-medium">Interpretar</button>
            </Seccion>

            <Seccion titulo="Nuevo registro" abierto={abierto.form} onToggle={() => toggle("form")}>
              <div className="grid grid-cols-2 gap-2">
                <Select label="Job" options={JOBS} />
                <Input label="ID Job" />
                <Input label="Sales" />
                <Select label="Método" options={METODOS} />
              </div>
              <button className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold mt-1">+ Agregar</button>
            </Seccion>

            <Seccion titulo={`Registros (${REGISTROS.length})`} abierto={abierto.registros} onToggle={() => toggle("registros")}>
              <div className="flex items-center justify-between -mt-1 mb-1">
                <span className="text-[11px] text-slate-400">Tocá una tarjeta para editar</span>
                <div className="flex gap-2 text-slate-400"><span>☑</span><span>⧉</span></div>
              </div>
              {REGISTROS.map((r, i) => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => setExpand(expand === i ? null : i)} className="w-full p-3 flex items-center gap-3 text-left">
                    <span className="text-lg">{jobIcon(r.job)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{r.job} <span className="text-[11px] text-slate-400">#{r.job_name}</span></p>
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-slate-500">{money(r.valor_servicio)}</span><TipoBadge tipo={r.tipo_pago} /></div>
                    </div>
                    <TotalPill total={r.total} />
                  </button>
                  {expand === i && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-2 bg-slate-50/60 border-t border-slate-100 pt-3">
                      <Field label="ID Job" value={r.job_name} />
                      <Field label="Sales" value={`$${r.valor_servicio}`} />
                      <Field label="% Téc" value={`${r.porcentaje_tecnico}%`} />
                      <Field label="Método" value={r.metodo_pago} />
                    </div>
                  )}
                </div>
              ))}
            </Seccion>

            <Seccion titulo={`Partes (${PARTES.length})`} abierto={abierto.partes} onToggle={() => toggle("partes")}>
              {PARTES.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-white/60 text-sm">
                  <span className="text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                  <span className="font-medium text-slate-700">${(p.valor * p.porcentaje_tecnico / 100).toFixed(2)}</span>
                </div>
              ))}
              <button className="self-start px-3 py-1.5 rounded-xl bg-white/70 border border-white/60 text-sky-600 text-xs font-medium">+ Agregar partes</button>
            </Seccion>
          </div>
        )}

        {tab === "balance" && (
          <div className="flex flex-col gap-3 p-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white text-center shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <p className="text-[11px] uppercase tracking-widest opacity-80">Balanced Tech</p>
              <p className="text-4xl font-extrabold mt-1">{money(BALANCE)}</p>
              <p className="text-[11px] opacity-80 mt-1">{REGISTROS.length} registros · {PARTES.length} partes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total Sales" value="$710" />
              <Stat label="Total Cash" value="$330" />
              <Stat label="Total CC" value="$400" />
              <Stat label="Jobs" value={REGISTROS.length} />
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Balance de partes</p>
              {PARTES.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                  <span className="font-medium text-slate-700">${(p.valor * p.porcentaje_tecnico / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-2xl bg-green-500 text-white text-sm font-semibold">Exportar Excel</button>
              <button className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium">Notas</button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar: Registros + Balance */}
      <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-2 py-2 flex justify-around">
        {[["registros", "📋", "Registros"], ["balance", "💰", "Balance"]].map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition ${tab === k ? "text-sky-600" : "text-slate-400"}`}>
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
//  C) Workspace con pestañas
// ══════════════════════════════════════════════════
function DiseñoC() {
  const [tab, setTab] = useState("regs")
  const tabs = [["regs", "📋", "Registros"], ["add", "➕", "Agregar"], ["partes", "🔧", "Partes"], ["bal", "💰", "Balance"]]

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-10 pb-4 bg-white/70 backdrop-blur-xl border-b border-white/60">
        <p className="text-sm font-bold text-slate-800">{NOMBRE} <span className="text-[10px] font-normal text-slate-500">· Semana {SEMANA}</span></p>
        <p className="text-2xl font-extrabold text-emerald-600 mt-1">{money(BALANCE)} <span className="text-[10px] font-medium text-slate-400 uppercase">balanced</span></p>
      </div>

      {/* Contenido por pestaña */}
      <div className="flex-1 overflow-auto p-4 pb-24">
        {tab === "regs" && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 bg-white/80 border border-white/70 rounded-2xl px-3 py-2.5 shadow-sm">
              <span className="text-slate-400">🔍</span>
              <input placeholder="Buscar…" className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            {REGISTROS.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-lg">{jobIcon(r.job)}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{r.job}</p>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-slate-500">{money(r.valor_servicio)}</span><TipoBadge tipo={r.tipo_pago} /></div>
                </div>
                <TotalPill total={r.total} />
              </div>
            ))}
          </div>
        )}

        {tab === "add" && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Pegar ticket (IA)</p>
              <textarea rows={2} placeholder="Pegá el mensaje…" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              <button className="self-end px-4 py-1.5 rounded-xl bg-sky-50 text-sky-600 text-xs font-medium">Interpretar</button>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Nuevo registro</p>
              <Select label="Job" options={JOBS} />
              <Input label="ID Job" />
              <Input label="Sales" />
              <Select label="Método" options={METODOS} />
              <button className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold mt-1">+ Agregar</button>
            </div>
          </div>
        )}

        {tab === "partes" && (
          <div className="flex flex-col gap-2.5">
            {PARTES.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
                <span className="text-sm text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                <span className="font-semibold text-slate-700">${(p.valor * p.porcentaje_tecnico / 100).toFixed(2)}</span>
              </div>
            ))}
            <button className="w-full py-2.5 rounded-2xl bg-sky-500 text-white text-sm font-semibold">+ Agregar partes</button>
          </div>
        )}

        {tab === "bal" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white text-center shadow-lg">
              <p className="text-[11px] uppercase tracking-widest opacity-80">Balanced Tech</p>
              <p className="text-4xl font-extrabold mt-1">{money(BALANCE)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total Sales" value="$710" />
              <Stat label="Total Cash" value="$330" />
              <Stat label="Total CC" value="$400" />
              <Stat label="Jobs" value={REGISTROS.length} />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-2xl bg-green-500 text-white text-sm font-semibold">Exportar Excel</button>
              <button className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium">Notas</button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-2 py-2 flex justify-around">
        {tabs.map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${tab === k ? "text-sky-600" : "text-slate-400"}`}>
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sub-componentes compartidos ───────────────────
function IconBtn({ children }) {
  return <button className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-slate-500 text-sm">{children}</button>
}
function Field({ label, value }) {
  return (
    <div className="bg-white/70 rounded-xl px-3 py-2 border border-white/60">
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
function Input({ label }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-slate-400">{label}</span>
      <input className="bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none" />
    </label>
  )
}
function Select({ label, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-slate-400">{label}</span>
      <select className="bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}
function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-700">{value}</p>
    </div>
  )
}
function Seccion({ titulo, abierto, onToggle, children }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{titulo}</span>
        <span className={`text-slate-400 transition ${abierto ? "rotate-90" : ""}`}>▸</span>
      </button>
      {abierto && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  )
}
