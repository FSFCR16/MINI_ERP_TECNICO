"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { obtenerTecnicos, semanasRecientes } from "@/Services/tencicosServices"
import { vaObtenerNombres, vaCrearTecnico, vaValidarSemana } from "@/Services/virginiaServices"
import { formatoFinal, formatearFechaSemana } from "@/Utils/api.js"

const Dot = ({ mod }) => <span className={`w-2 h-2 rounded-full shrink-0 ${mod === "gen" ? "bg-sky-500" : "bg-indigo-500"}`} />

const ACTUAL = "__actual__"

// Agrega/crea un técnico en una semana.
//  • Si recibe `semana`, queda fijada (uso desde "Por semana").
//  • Si NO recibe `semana`, muestra selector de semana (actual + recientes antiguas).
// El técnico "entra" a la semana al guardar su primer registro.
// En Virginia, si el nombre es nuevo se crea el técnico (POST) antes de navegar.
export function AgregarTecnicoModal({ semana = null, rango = null, onClose }) {
  const router = useRouter()
  const [modulo, setModulo] = useState("gen")
  const [busqueda, setBusqueda] = useState("")
  const [nombresGen, setNombresGen] = useState([])
  const [nombresVir, setNombresVir] = useState([])
  const [recientes, setRecientes] = useState([])
  const [semanaSel, setSemanaSel] = useState(semana || ACTUAL)
  const [yendo, setYendo] = useState(false)

  useEffect(() => {
    obtenerTecnicos().then((d) => setNombresGen(Array.isArray(d) ? d : [])).catch(() => {})
    vaObtenerNombres().then((d) => setNombresVir(Array.isArray(d) ? d : [])).catch(() => {})
    if (!semana) semanasRecientes(8).then((d) => setRecientes(Array.isArray(d) ? d : [])).catch(() => {})
  }, [semana])

  // rango de la semana ACTUAL (lunes-domingo) para mostrarlo en la opción
  const rangoActual = useMemo(() => {
    const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const hoy = new Date()
    const dia = hoy.getDay() === 0 ? 7 : hoy.getDay()
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (dia - 1))
    const dom = new Date(lunes); dom.setDate(lunes.getDate() + 6)
    return `${formatearFechaSemana(toISO(lunes))} / ${formatearFechaSemana(toISO(dom))}`
  }, [])

  const nombres = modulo === "gen" ? nombresGen : nombresVir
  const q = busqueda.trim()
  const filtrados = useMemo(() => {
    const ql = q.toLowerCase()
    return nombres.filter((n) => String(n).toLowerCase().includes(ql)).slice(0, 8)
  }, [nombres, q])

  // ¿el nombre tecleado ya existe (case-insensitive)?
  const existe = useMemo(
    () => nombres.some((n) => String(n).toLowerCase() === q.toLowerCase()),
    [nombres, q],
  )
  const puedeCrear = q.length > 0 && !existe

  const resolverSemana = async () => {
    if (semana) return semana
    if (semanaSel === ACTUAL) {
      if (modulo === "gen") return formatoFinal()
      const s = await vaValidarSemana()
      return s.semana
    }
    return semanaSel
  }

  const ir = async (nombre, crear = false) => {
    const limpio = String(nombre || "").trim()
    if (!limpio) return
    setYendo(true)
    try {
      const sem = await resolverSemana()
      if (modulo === "vir" && crear) {
        // crea el técnico Virginia (ignora 409 si ya existía por carrera)
        await vaCrearTecnico({ nombre: limpio.toUpperCase() }).catch(() => {})
      }
      const enc = encodeURIComponent(modulo === "vir" ? limpio.toUpperCase() : limpio)
      router.push(modulo === "vir" ? `/virginia/${enc}/${sem}` : `/tecnico/${enc}/${sem}`)
    } catch {
      setYendo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40 w-full max-w-md flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Agregar / crear técnico</h2>
          {semana
            ? rango && <p className="text-xs text-slate-400 mt-0.5">Semana {rango}</p>
            : <p className="text-xs text-slate-400 mt-0.5">Elegí módulo, semana y técnico</p>}
        </div>

        {/* Toggle módulo */}
        <div className="inline-flex bg-white/50 rounded-xl p-1 border border-white/50 w-fit">
          {[["gen", "General"], ["vir", "Virginia"]].map(([k, l]) => (
            <button key={k} onClick={() => { setModulo(k); setBusqueda("") }} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg font-medium transition cursor-pointer ${modulo === k ? `${k === "gen" ? "bg-sky-500" : "bg-indigo-500"} text-white` : "text-slate-600 hover:bg-white/60"}`}>
              <Dot mod={k} /> {l}
            </button>
          ))}
        </div>

        {/* Selector de semana (solo si no viene fijada) */}
        {!semana && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Semana</label>
            <select
              value={semanaSel}
              onChange={(e) => setSemanaSel(e.target.value)}
              className="bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white/90 cursor-pointer"
            >
              <option value={ACTUAL}>Semana actual · {rangoActual}</option>
              {recientes.map((s) => (
                <option key={s.label} value={s.label}>
                  {formatearFechaSemana(s.fecha_inicio)} / {formatearFechaSemana(s.fecha_fin)}
                </option>
              ))}
            </select>
          </div>
        )}

        <input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { if (filtrados[0]) ir(filtrados[0]); else if (puedeCrear) ir(q, true) } }}
          placeholder={`Buscar o crear técnico de ${modulo === "gen" ? "General" : "Virginia"}...`}
          className="bg-white/70 border border-white/60 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white/90"
        />

        <div className="flex flex-col gap-1 max-h-[240px] overflow-auto custom-scroll">
          {puedeCrear && (
            <button onClick={() => ir(q, true)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer text-left">
              <span className="text-emerald-600 font-bold">＋</span>
              <span className="text-sm font-medium text-emerald-700">Crear «{q.toUpperCase()}»</span>
            </button>
          )}
          {filtrados.length === 0 && !puedeCrear ? (
            <p className="text-xs text-slate-400 px-1 py-2">{busqueda ? "Sin resultados" : "Escribí para buscar o crear…"}</p>
          ) : (
            filtrados.map((n) => (
              <button key={n} onClick={() => ir(n)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/60 border border-white/50 hover:bg-sky-50 cursor-pointer text-left">
                <Dot mod={modulo} /><span className="text-sm font-medium text-slate-700">{n}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} disabled={yendo} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium hover:bg-white active:scale-95 transition cursor-pointer disabled:opacity-50">
            {yendo ? "Abriendo…" : "Cerrar"}
          </button>
        </div>
      </div>
    </div>
  )
}
