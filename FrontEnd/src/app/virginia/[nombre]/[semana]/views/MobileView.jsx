"use client"
import { useState } from "react"
import Link from "next/link"
import { useClipboardStore } from "@/app/stores/useClipboardStore"

// Vista MÓVIL de Virginia: acordeón (pestaña Registros) + pestaña Balance.
// Cableada al motor diferido useVirginiaTabla (editar/agregar/eliminar/guardar).

const idDe = (r) => r.id_registro ?? r.id
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
const jobIcon = (job) => ({ "LOCKOUT": "🔑", "CAR KEY": "🚗", "PVT JOBS": "🔧" }[job] || "🧰")
const TIPOS = ["CASH", "CC", "MIXTO"]

function TipoBadge({ tipo }) {
  const map = {
    CASH: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CC: "bg-rose-100 text-rose-700 border-rose-200",
    MIXTO: "bg-amber-100 text-amber-700 border-amber-200",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[tipo] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{tipo || "—"}</span>
}

function TotalPill({ total }) {
  const neg = Number(total) < 0
  return <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${neg ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{money(total)}</span>
}

export function MobileView({
  nombre, semana, semanaFechas, error, setError,
  rowData, cambiarCampo, opcionesPago, jobs, esMixto,
  partes, eliminarParte, balancePartes, balanceTech,
  tabla, erroresAlta = [], tieneError = () => false,
  onAgregar, onParsear, pedirExportar,
  abrirPartes, abrirNotas, abrirHistorial,
}) {
  const [tab, setTab] = useState("registros")
  const [abierto, setAbierto] = useState({ ia: false, form: true, registros: true, partes: false })
  const [expand, setExpand] = useState(null)
  const [mensaje, setMensaje] = useState("")
  const [parsing, setParsing] = useState(false)
  const [msgFoco, setMsgFoco] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const toggle = (k) => setAbierto(p => ({ ...p, [k]: !p[k] }))

  const copiarRegistros = useClipboardStore(s => s.copiarRegistros)
  const limpiarClipboard = useClipboardStore(s => s.limpiarClipboard)
  const clipboardLen = useClipboardStore(s => s.clipboardRegistros.length)

  const lista = tabla.state.listRegistro
  const seleccion = tabla.state.elementosAEliminar
  const listaVisible = busqueda.trim()
    ? lista.filter(r => `${r.job} ${r.job_name} ${r.tipo_pago} ${r.metodo_pago}`.toLowerCase().includes(busqueda.toLowerCase()))
    : lista

  const ejecutarParser = async () => {
    if (!mensaje.trim()) return
    setParsing(true)
    await onParsear(mensaje)
    setParsing(false)
  }

  const editar = (row, key, valor) => tabla.handlers.actualizarCeldaRegistro(idDe(row), key, valor)
  const errCls = (k) => tieneError(k) ? " border-rose-400 bg-rose-50/50" : ""
  const copiarSel = () => { if (seleccion.length) copiarRegistros(seleccion.map(r => ({ ...r }))) }

  // Stats del balance
  const totalSales = lista.reduce((a, r) => a + (Number(r.valor_servicio) || 0), 0)
  const totalCash = lista.reduce((a, r) => a + (r.tipo_pago === "CASH" ? Number(r.valor_servicio) || 0 : r.tipo_pago === "MIXTO" ? Number(r.valor_efectivo) || 0 : 0), 0)
  const totalCC = lista.reduce((a, r) => a + (r.tipo_pago === "CC" ? Number(r.valor_servicio) || 0 : r.tipo_pago === "MIXTO" ? Number(r.valor_tarjeta) || 0 : 0), 0)

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 flex flex-col" style={{ paddingBottom: "76px" }}>

      {/* HEADER */}
      <div className="px-4 pt-4 pb-3 bg-white/70 backdrop-blur-xl border-b border-white/60 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/virginia" className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-slate-500 shrink-0">‹</Link>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{nombre}</p>
              <p className="text-[10px] text-slate-500">Sem {semanaFechas.inicio} / {semanaFechas.fin}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={abrirNotas} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-white/70 border border-white/60 text-amber-600 font-medium">Notas</button>
            <button onClick={abrirHistorial} className="px-2.5 py-1.5 text-[11px] rounded-lg bg-white/70 border border-white/60 text-amber-600 font-medium">Hist.</button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <IconBtn onClick={tabla.deshacer} disabled={!tabla.puedeDeshacer}>↶</IconBtn>
            <IconBtn onClick={tabla.rehacer} disabled={!tabla.puedeRehacer}>↷</IconBtn>
          </div>
          <button onClick={tabla.guardar} disabled={!tabla.hayPendientes || tabla.guardando} className="px-4 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-semibold shadow disabled:opacity-40">
            {tabla.guardando ? "Guardando…" : tabla.hayPendientes ? "Guardar •" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">cerrar</button>
        </div>
      )}

      {/* CONTENIDO */}
      <div className="flex-1 overflow-auto">
        {tab === "registros" && (
          <div className="flex flex-col gap-3 p-4">

            {/* Parser IA */}
            <Seccion titulo="Pegar ticket (IA)" abierto={abierto.ia} onToggle={() => toggle("ia")}>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} onFocus={() => setMsgFoco(true)} onBlur={() => setMsgFoco(false)} rows={msgFoco || mensaje ? 8 : 2} placeholder="Pegá el mensaje…" className="w-full bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none resize-y transition-all duration-200" />
              <button onClick={ejecutarParser} disabled={parsing} className="self-end px-4 py-1.5 rounded-xl bg-white/70 border border-white/60 text-sky-600 text-xs font-medium disabled:opacity-50">{parsing ? "…" : "Interpretar"}</button>
            </Seccion>

            {/* Nuevo registro */}
            <Seccion titulo="Nuevo registro" abierto={abierto.form} onToggle={() => toggle("form")}>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Job">
                  <select value={rowData.job} onChange={(e) => cambiarCampo("job", e.target.value)} className={inputCls + errCls("job")}>
                    <option value="">—</option>
                    {jobs.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </Campo>
                <Campo label="ID Job">
                  <input value={rowData.job_name} onChange={(e) => cambiarCampo("job_name", e.target.value)} className={inputCls + errCls("job_name")} />
                </Campo>
                <Campo label="Valor servicio">
                  <input type="number" inputMode="decimal" value={rowData.valor_servicio || ""} onChange={(e) => cambiarCampo("valor_servicio", Number(e.target.value))} className={inputCls + errCls("valor_servicio")} />
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
                      <input type="number" inputMode="decimal" value={rowData.valor_efectivo || ""} onChange={(e) => cambiarCampo("valor_efectivo", Number(e.target.value))} className={inputCls} />
                    </Campo>
                    <Campo label="Tarjeta">
                      <input type="number" inputMode="decimal" value={rowData.valor_tarjeta || ""} onChange={(e) => cambiarCampo("valor_tarjeta", Number(e.target.value))} className={inputCls} />
                    </Campo>
                  </>
                )}
                <Campo label="% Propio (compartido)">
                  <input type="number" inputMode="decimal" min={1} max={100} value={rowData.participacion ?? 100} onChange={(e) => cambiarCampo("participacion", Number(e.target.value))} className={inputCls} />
                </Campo>
              </div>
              <div className="flex items-center justify-between px-1 mt-1">
                <span className="text-[11px] text-slate-500">% Téc: <b>{rowData.porcentaje_tecnico}</b></span>
                <span className={`text-sm font-semibold ${rowData.total < 0 ? "text-rose-600" : "text-green-600"}`}>{money(rowData.total)}</span>
              </div>
              {erroresAlta.length > 0 && (
                <p className="text-[11px] text-rose-500 px-1">{erroresAlta.map(e => `${e.label}: ${e.message}`).join(" · ")}</p>
              )}
              <button onClick={onAgregar} className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold mt-1">+ Agregar</button>
            </Seccion>

            {/* Registros */}
            <Seccion titulo={`Registros (${lista.length})`} abierto={abierto.registros} onToggle={() => toggle("registros")}>
              {/* Buscador */}
              <div className="flex items-center gap-2 bg-white/70 border border-white/60 rounded-xl px-3 py-2">
                <span className="text-slate-400 text-sm">🔍</span>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar registro…" className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
                {busqueda && <button onClick={() => setBusqueda("")} className="text-slate-400 text-xs">✕</button>}
              </div>

              {/* Toolbar: seleccionar / copiar / pegar / eliminar */}
              {(lista.length > 0 || clipboardLen > 0) && (
                <div className="flex items-center gap-2 flex-wrap px-1">
                  {lista.length > 0 && (
                    <button onClick={tabla.handlers.toggleSeleccionTodos} className="px-2.5 py-1 rounded-lg bg-white/70 border border-white/60 text-slate-600 text-[11px] font-medium">
                      {seleccion.length === lista.length ? "Quitar todos" : "Sel. todos"}
                    </button>
                  )}
                  {seleccion.length > 0 && (
                    <>
                      <span className="text-[11px] text-slate-500">{seleccion.length} sel.</span>
                      <button onClick={copiarSel} className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-[11px] font-medium border border-sky-200">Copiar</button>
                      <button onClick={tabla.handlers.eliminarSeleccionados} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-medium border border-rose-200">Eliminar</button>
                    </>
                  )}
                  {clipboardLen > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button onClick={tabla.handlers.pegar} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-medium border border-emerald-200">Pegar ({clipboardLen})</button>
                      <button onClick={limpiarClipboard} title="Vaciar copiado" className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] border border-slate-200">✕</button>
                    </div>
                  )}
                </div>
              )}

              {lista.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">Sin registros esta semana.</p>}
              {lista.length > 0 && listaVisible.length === 0 && <p className="text-xs text-slate-400 px-1 py-2">Sin resultados para “{busqueda}”.</p>}
              {listaVisible.map((row, i) => {
                const sel = seleccion.includes(row)
                const abiertoCard = expand === idDe(row)
                return (
                  <div key={idDe(row)} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sel ? "border-sky-400 ring-1 ring-sky-300" : "border-slate-100"}`}>
                    <div className="w-full p-3 flex items-center gap-2.5">
                      <button onClick={() => tabla.handlers.toggleSeleccion(row)} className={`w-5 h-5 rounded-md border flex items-center justify-center text-[11px] shrink-0 ${sel ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300 text-transparent"}`}>✓</button>
                      <button onClick={() => setExpand(abiertoCard ? null : idDe(row))} className="flex-1 flex items-center gap-2.5 text-left min-w-0">
                        <span className="text-lg shrink-0">{jobIcon(row.job)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{row.job || "—"} <span className="text-[11px] text-slate-400">#{row.job_name}</span></p>
                          <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-slate-500">{money(row.valor_servicio)}</span><TipoBadge tipo={row.tipo_pago} />{Number(row.participacion ?? 100) < 100 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-200">Compartido {row.participacion}%</span>}</div>
                        </div>
                        <TotalPill total={row.total} />
                        <span className={`text-slate-300 transition ${abiertoCard ? "rotate-90" : ""}`}>›</span>
                      </button>
                    </div>
                    {abiertoCard && (
                      <div className="px-3 pb-3 grid grid-cols-2 gap-2 bg-slate-50/60 border-t border-slate-100 pt-3">
                        <CampoEdit label="ID Job">
                          <input defaultValue={row.job_name} onBlur={(e) => editar(row, "job_name", e.target.value)} className={inputEdit} />
                        </CampoEdit>
                        <CampoEdit label="Sales">
                          <input type="number" inputMode="decimal" defaultValue={row.valor_servicio} onBlur={(e) => editar(row, "valor_servicio", Number(e.target.value))} className={inputEdit} />
                        </CampoEdit>
                        <CampoEdit label="Tipo">
                          <select value={row.tipo_pago} onChange={(e) => editar(row, "tipo_pago", e.target.value)} className={inputEdit}>
                            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </CampoEdit>
                        <CampoEdit label="% Téc">
                          <input type="number" inputMode="decimal" defaultValue={row.porcentaje_tecnico} onBlur={(e) => editar(row, "porcentaje_tecnico", Number(e.target.value))} className={inputEdit} />
                        </CampoEdit>
                        <CampoEdit label="% Propio">
                          <input type="number" inputMode="decimal" min={1} max={100} defaultValue={row.participacion ?? 100} onBlur={(e) => editar(row, "participacion", Number(e.target.value))} className={inputEdit} />
                        </CampoEdit>
                        {row.tipo_pago === "MIXTO" && (
                          <>
                            <CampoEdit label="Efectivo">
                              <input type="number" inputMode="decimal" defaultValue={row.valor_efectivo} onBlur={(e) => editar(row, "valor_efectivo", Number(e.target.value))} className={inputEdit} />
                            </CampoEdit>
                            <CampoEdit label="Tarjeta">
                              <input type="number" inputMode="decimal" defaultValue={row.valor_tarjeta} onBlur={(e) => editar(row, "valor_tarjeta", Number(e.target.value))} className={inputEdit} />
                            </CampoEdit>
                          </>
                        )}
                        <CampoEdit label="Método"><span className="text-sm text-slate-600 px-1">{row.metodo_pago || "—"}</span></CampoEdit>
                      </div>
                    )}
                  </div>
                )
              })}
            </Seccion>

            {/* Partes */}
            <Seccion titulo={`Partes (${partes.length})`} abierto={abierto.partes} onToggle={() => toggle("partes")}>
              {partes.length === 0 && <p className="text-xs text-slate-400 px-1">Sin partes esta semana.</p>}
              {partes.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2 border border-white/60 text-sm">
                  <span className="text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">${((p.valor || 0) * (p.porcentaje_tecnico || 0) / 100).toFixed(2)}</span>
                    <button onClick={() => eliminarParte(p.id)} className="text-rose-400">✕</button>
                  </div>
                </div>
              ))}
              <button onClick={abrirPartes} className="self-start px-3 py-1.5 rounded-xl bg-white/70 border border-white/60 text-sky-600 text-xs font-medium">+ Agregar partes</button>
            </Seccion>
          </div>
        )}

        {tab === "balance" && (
          <div className="flex flex-col gap-3 p-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white text-center shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <p className="text-[11px] uppercase tracking-widest opacity-80">Balanced Tech</p>
              <p className="text-4xl font-extrabold mt-1">{money(balanceTech)}</p>
              <p className="text-[11px] opacity-80 mt-1">{lista.length} registros · {partes.length} partes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total Sales" value={money(totalSales)} />
              <Stat label="Total Cash" value={money(totalCash)} />
              <Stat label="Total CC" value={money(totalCC)} />
              <Stat label="Jobs" value={lista.length} />
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Balance de partes</p>
              {partes.length === 0 && <p className="text-xs text-slate-400">Sin partes.</p>}
              {partes.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.job} · ${p.valor} × {p.porcentaje_tecnico}%</span>
                  <span className="font-medium text-slate-700">${((p.valor || 0) * (p.porcentaje_tecnico || 0) / 100).toFixed(2)}</span>
                </div>
              ))}
              {partes.length > 0 && <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">Balance partes: <b>${balancePartes}</b></div>}
            </div>
            <div className="flex gap-2">
              <button onClick={pedirExportar} className="flex-1 py-2.5 rounded-2xl bg-green-500 text-white text-sm font-semibold">Exportar Excel</button>
              <button onClick={abrirNotas} className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium">Notas</button>
            </div>
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-2 py-2 flex justify-around z-20">
        {[["registros", "📋", "Registros"], ["balance", "💰", "Balance"]].map(([k, icon, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-0.5 px-8 py-1 rounded-xl transition ${tab === k ? "text-sky-600" : "text-slate-400"}`}>
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────
const inputCls = "bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white/90 w-full"
const inputEdit = "bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-sky-400 w-full"

function IconBtn({ children, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center text-slate-500 text-sm disabled:opacity-40">{children}</button>
}
function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-slate-400">{label}</span>
      {children}
    </label>
  )
}
function CampoEdit({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-slate-400">{label}</span>
      {children}
    </div>
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
