"use client"
import { useState, useMemo, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { NotasModal } from "@/Components/NotasModal.jsx"
import { ModalHistorialVirginia } from "../../components/ModalHistorialVirginia.jsx"
import { DesktopView } from "./views/DesktopView.jsx"
import { MobileView } from "./views/MobileView.jsx"
import { useVirginiaRegistros } from "./hooks/useVirginiaRegistros"
import { useVirginiaTabla } from "./hooks/useVirginiaTabla"
import { JOBS_VIRGINIA, registroVirginiaSchema } from "../../schemas/virginiaSchema"
import { mapearErroresZod } from "@/Utils/api.js"
import {
  vaListarNotas, vaSeedNotas, vaCrearNota, vaActualizarNota, vaEliminarNota, vaValidarJob,
} from "@/Services/virginiaServices"

const notasServices = {
  listar: vaListarNotas, seed: vaSeedNotas, crear: vaCrearNota,
  actualizar: vaActualizarNota, eliminar: vaEliminarNota,
}

export default function VirginiaRegistrosPage() {
  const params = useParams()
  const nombre = decodeURIComponent(params.nombre)
  const semana = decodeURIComponent(params.semana)

  const datos = useVirginiaRegistros(nombre, semana)
  const { tecnico, registros, setRegistros, loading } = datos

  const tabla = useVirginiaTabla({ registros, setRegistros, tecnico, semana })

  const [modalPartes, setModalPartes] = useState(false)
  const [modalNotas, setModalNotas] = useState(false)
  const [modalHistorial, setModalHistorial] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── modales/estado de los nuevos features ──
  const [erroresAlta, setErroresAlta] = useState([])     // [{key,label,message}]
  const [jobDup, setJobDup] = useState(null)             // técnico que ya tiene el job
  const [faltantes, setFaltantes] = useState(null)       // [{key,label}] tras parser IA
  const [metodoDesc, setMetodoDesc] = useState(null)     // método mencionado por la IA pero no configurado
  const [modalExport, setModalExport] = useState(false)
  const [modalSinReg, setModalSinReg] = useState(false)
  const confirmRef = useRef(null)
  const mensajeRef = useRef("")          // último mensaje parseado (para re-parsear tras crear método)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const notasDefault = useMemo(() => {
    const cfg = tecnico?.configs?.[0]
    if (!cfg) return []
    const arr = []
    if (cfg.minimo != null) arr.push(`El minimo de este tecnico es de ${cfg.minimo} dolares`)
    if (cfg.porcentaje_adicional_empresa) arr.push(`Este técnico tiene un porcentaje adicional para ciertos servicios de ${cfg.porcentaje_adicional_empresa}$`)
    if (cfg.cargo_sabados) arr.push(`Este técnico tiene un porcentaje diferente si el servicio fue en sábado: ${cfg.cargo_sabados}%`)
    return arr
  }, [tecnico])

  const jobs = datos.jobsDisponibles.length ? datos.jobsDisponibles : JOBS_VIRGINIA
  const esMixto = datos.rowData.tipo_pago === "MIXTO"
  const tieneError = (key) => erroresAlta.some((e) => e.key === key)

  // ── Alta con validación Zod + chequeo de job duplicado ──
  const onAgregar = async () => {
    const parsed = registroVirginiaSchema.safeParse(datos.rowData)
    if (!parsed.success) { setErroresAlta(mapearErroresZod(parsed.error)); return }
    setErroresAlta([])

    const jn = datos.rowData.job_name
    if (jn) {
      try {
        const { existe, tecnico: dup } = await vaValidarJob(jn)
        if (existe) {
          const ok = await new Promise((res) => { confirmRef.current = res; setJobDup(dup) })
          if (!ok) return
        }
      } catch (e) { console.error("Error validando job duplicado:", e) }
    }

    const fila = datos.agregarRegistro()
    if (fila) tabla.agregarFila(fila)
  }

  const cerrarJobDup = (ok) => { confirmRef.current?.(ok); confirmRef.current = null; setJobDup(null) }

  // Calcula los campos faltantes a partir de la fila + flag de job resuelto por la IA.
  const calcularFaltantes = (row, jobResuelto) => {
    const falt = []
    if (!jobResuelto) falt.push({ key: "job", label: "Tipo de Job" })
    if (!row.job_name) falt.push({ key: "job_name", label: "ID Job" })
    if (!(Number(row.valor_servicio) > 0)) falt.push({ key: "valor_servicio", label: "Valor servicio" })
    if (!row.metodo_pago) falt.push({ key: "metodo_pago", label: "Método de pago" })
    return falt
  }

  // Procesa el resultado del parser: si hay métodos no reconocidos (simple o cada pata
  // de un MIXTO) abre el modal para crearlos uno a uno; si no, muestra los faltantes.
  const procesarResultado = (res) => {
    if (!res) return
    const { row, jobResuelto, noReconocidos = [] } = res
    if (noReconocidos.length) {
      setMetodoDesc({ nombre: noReconocidos[0], pendientes: noReconocidos.slice(1), jobResuelto })
      return
    }
    const falt = calcularFaltantes(row, jobResuelto)
    if (falt.length) setFaltantes(falt)
  }

  // ── Parser IA ──
  const onParsear = async (mensaje) => {
    mensajeRef.current = mensaje
    const res = await datos.parsearMensaje(mensaje)
    procesarResultado(res)
  }

  // Creó el método → lo agrega, re-parsea el MISMO mensaje (ya con el método en la lista,
  // así la IA arma el split del MIXTO bien) y sigue el flujo.
  const crearMetodoDesc = async ({ nombre, trato, principal }) => {
    const nuevosMetodos = await datos.crearMetodo({ nombre, trato, principal })
    setMetodoDesc(null)
    if (!nuevosMetodos) return
    const res = await datos.parsearMensaje(mensajeRef.current, nuevosMetodos)
    procesarResultado(res)
  }

  // Omitió la creación → no se puede mapear ese pago; sigue con los faltantes (pedirá el método).
  const omitirMetodoDesc = async () => {
    const pendientes = metodoDesc?.pendientes ?? []
    const jobResuelto = metodoDesc?.jobResuelto ?? false
    setMetodoDesc(null)
    if (pendientes.length) {
      setMetodoDesc({ nombre: pendientes[0], pendientes: pendientes.slice(1), jobResuelto })
      return
    }
    const falt = calcularFaltantes(datos.rowData, jobResuelto)
    if (falt.length) setFaltantes(falt)
  }

  // ── Export con confirmación / aviso sin registros ──
  const pedirExportar = () => {
    const guardados = datos.registros.filter((r) => r.id_registro)
    if (!guardados.length) { setModalSinReg(true); return }
    setModalExport(true)
  }

  const viewProps = {
    ...datos,
    nombre, semana, tabla, jobs, esMixto,
    erroresAlta, tieneError,
    onAgregar, onParsear, pedirExportar,
    abrirPartes: () => setModalPartes(true),
    abrirNotas: () => setModalNotas(true),
    abrirHistorial: () => setModalHistorial(true),
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      {isMobile ? <MobileView {...viewProps} /> : <DesktopView {...viewProps} />}

      {modalPartes && (
        <ModalPartes
          jobs={jobs}
          onClose={() => setModalPartes(false)}
          onConfirmar={async (job, valor) => { await datos.agregarParte(job, valor); setModalPartes(false) }}
        />
      )}

      {modalNotas && (
        <NotasModal nombre={nombre} semana={semana} defaults={notasDefault} services={notasServices} onClose={() => setModalNotas(false)} />
      )}

      {modalHistorial && (
        <ModalHistorialVirginia nombre={nombre} onClose={() => setModalHistorial(false)} />
      )}

      {jobDup && <ModalJobDuplicado tecnico={jobDup} onConfirmar={() => cerrarJobDup(true)} onCancelar={() => cerrarJobDup(false)} />}

      {metodoDesc && (
        <ModalMetodoDesconocido
          key={metodoDesc.nombre}
          metodo={metodoDesc.nombre}
          tecnico={nombre}
          onCrear={crearMetodoDesc}
          onOmitir={omitirMetodoDesc}
        />
      )}

      {faltantes && (
        <ModalCamposFaltantes
          faltantes={faltantes}
          rowData={datos.rowData}
          cambiarCampo={datos.cambiarCampo}
          jobs={jobs}
          opcionesPago={datos.opcionesPago}
          onClose={() => setFaltantes(null)}
        />
      )}

      {modalExport && (
        <ModalConfirm
          title="Exportar Excel"
          message="Se exportarán los registros guardados de esta semana. ¿Continuar?"
          confirmText="Exportar"
          onConfirm={() => { setModalExport(false); datos.exportarExcel() }}
          onClose={() => setModalExport(false)}
        />
      )}

      {modalSinReg && (
        <ModalConfirm
          title="Sin registros"
          message="No hay registros guardados para exportar. Guardá primero los cambios pendientes."
          confirmText="Entendido"
          soloAceptar
          onConfirm={() => setModalSinReg(false)}
          onClose={() => setModalSinReg(false)}
        />
      )}
    </>
  )
}

const inputCls = "bg-white/60 border border-white/50 rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/80"

function ModalPartes({ jobs, onClose, onConfirmar }) {
  const [job, setJob] = useState(jobs[0] ?? "")
  const [valor, setValor] = useState("")
  return (
    <Overlay onClose={onClose}>
      <h2 className="text-base font-semibold text-slate-800">Agregar partes</h2>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-500">Job (define el %)</label>
        <select value={job} onChange={(e) => setJob(e.target.value)} className={inputCls}>
          {jobs.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <label className="text-xs text-slate-500 mt-1">Valor</label>
        <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus className={inputCls} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium hover:bg-white active:scale-95 transition cursor-pointer">Cancelar</button>
        <button onClick={() => job && valor && onConfirmar(job, valor)} disabled={!job || !valor} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-sky-600 font-medium hover:bg-white active:scale-95 transition cursor-pointer disabled:opacity-50">Agregar</button>
      </div>
    </Overlay>
  )
}

function ModalJobDuplicado({ tecnico, onConfirmar, onCancelar }) {
  return (
    <Overlay onClose={onCancelar}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚠️</span>
        <h2 className="text-base font-semibold text-slate-800">Este ID Job ya existe</h2>
      </div>
      <p className="text-sm text-slate-600">
        El ID Job <b>{tecnico.job_name}</b> ya está registrado para <b>{tecnico.nombre}</b> ({tecnico.job}),
        semana {tecnico.fecha_inicio} → {tecnico.fecha_fin}. Total: <b>${tecnico.total}</b>.
      </p>
      <p className="text-sm text-slate-500">¿Agregarlo de todas formas?</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancelar} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-slate-600 font-medium hover:bg-white active:scale-95 transition cursor-pointer">Cancelar</button>
        <button onClick={onConfirmar} className="px-4 py-1.5 text-sm rounded-xl bg-amber-500 text-white font-medium hover:opacity-90 active:scale-95 transition cursor-pointer">Agregar igual</button>
      </div>
    </Overlay>
  )
}

function ModalCamposFaltantes({ faltantes, rowData, cambiarCampo, jobs, opcionesPago, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <h2 className="text-base font-semibold text-slate-800">Completá los datos faltantes</h2>
      <p className="text-xs text-slate-500 -mt-2">La IA no detectó todo. Completá lo que falta y cerrá para terminar el alta.</p>
      <div className="flex flex-col gap-2.5">
        {faltantes.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-[11px] uppercase text-slate-400">{label}</span>
            {key === "job" ? (
              <select value={rowData.job} onChange={(e) => cambiarCampo("job", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {jobs.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            ) : key === "metodo_pago" ? (
              <select value={rowData.metodo_pago} onChange={(e) => cambiarCampo("metodo_pago", e.target.value)} className={inputCls}>
                <option value="">—</option>
                {opcionesPago.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : key === "valor_servicio" ? (
              <input type="number" value={rowData.valor_servicio || ""} onChange={(e) => cambiarCampo("valor_servicio", Number(e.target.value))} className={inputCls} />
            ) : (
              <input value={rowData[key] ?? ""} onChange={(e) => cambiarCampo(key, e.target.value)} className={inputCls} />
            )}
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl bg-sky-500 text-white font-medium hover:opacity-90 active:scale-95 transition cursor-pointer">Listo</button>
      </div>
    </Overlay>
  )
}

function ModalMetodoDesconocido({ metodo, tecnico, onCrear, onOmitir }) {
  const [nombre, setNombre] = useState(metodo)
  const [trato, setTrato] = useState("CC")
  const [principal, setPrincipal] = useState(false)
  const [creando, setCreando] = useState(false)

  const crear = async () => {
    if (!nombre.trim() || creando) return
    setCreando(true)
    await onCrear({ nombre, trato, principal })
    // el modal se cierra desde el caller; no reseteamos creando para evitar doble click
  }

  return (
    <Overlay onClose={onOmitir}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">💳</span>
        <h2 className="text-base font-semibold text-slate-800">Método de pago no configurado</h2>
      </div>
      <p className="text-sm text-slate-600">
        El técnico <b>{tecnico}</b> no tiene el método <b>«{metodo}»</b> que aparece en el mensaje.
        ¿Querés crearlo ahora?
      </p>
      <div className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-slate-400">Nombre del método</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase text-slate-400">Trato (cómo se calcula)</span>
          <select value={trato} onChange={(e) => setTrato(e.target.value)} className={inputCls}>
            <option value="CC">CC (tarjeta)</option>
            <option value="CASH">CASH (efectivo)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={principal} onChange={(e) => setPrincipal(e.target.checked)} />
          Marcar como método principal
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onOmitir} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-slate-600 font-medium hover:bg-white active:scale-95 transition cursor-pointer">Omitir</button>
        <button onClick={crear} disabled={creando || !nombre.trim()} className="px-4 py-1.5 text-sm rounded-xl bg-sky-500 text-white font-medium hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-50">
          {creando ? "Creando…" : "Crear y usar"}
        </button>
      </div>
    </Overlay>
  )
}

function ModalConfirm({ title, message, confirmText = "Aceptar", soloAceptar = false, onConfirm, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2">
        {!soloAceptar && <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-slate-600 font-medium hover:bg-white active:scale-95 transition cursor-pointer">Cancelar</button>}
        <button onClick={onConfirm} className="px-4 py-1.5 text-sm rounded-xl bg-sky-500 text-white font-medium hover:opacity-90 active:scale-95 transition cursor-pointer">{confirmText}</button>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40 w-full max-w-sm flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
