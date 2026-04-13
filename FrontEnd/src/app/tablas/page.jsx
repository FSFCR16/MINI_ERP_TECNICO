"use client"

import { useEffect, useState, useRef } from "react"
import { traerSemanas, traerTecnicosSemana, eliminarSemana, eliminarTecnicoSemana, obtenerTecnicos, getRegistrosPrevios, exportarExcelDBPost } from "../../Services/tencicosServices.js"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { useRouter } from "next/navigation"
import { useModalState } from "../tecnico/[nombre]/[semana]/hooks/useModalState.js"
import { ModalManager } from "../tecnico/components_modal/ModalManager.jsx"
import { formatearNumero } from "@/Utils/api.js"
import Link from "next/link"
import { ModalAgregarTecnico } from "../tecnico/components_modal/ModalAgregarTecnico.jsx"
export default function Page() {

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [vistaSemanas, setVistaSemanas] = useState(true)
    const [listSemanas, setListSemanas] = useState([])
    const [listTecnicos, setListTecnicos] = useState([])
    const [listFiltrada, setListFiltrada] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [semanaSeleccionada, setSemanaSeleccionada] = useState(null)
    const [accionPendiente, setAccionPendiente] = useState(null)

    // modal
    const { modal, openModal, openError, closeModal } = useModalState()

    // modal agregar técnico
    const [modalAgregar, setModalAgregar] = useState(false)
    const [tecnicos, setTecnicos] = useState([])
    const [busquedaTecnico, setBusquedaTecnico] = useState("")
    const [indexResaltado, setIndexResaltado] = useState(-1)
    const itemsRef = useRef([])

    const filtradosTecnicos = tecnicos.filter(t =>
        t.toLowerCase().startsWith(busquedaTecnico.toLowerCase())
    )
    const tecnicoValido = tecnicos.includes(busquedaTecnico.toUpperCase())

    const router = useRouter()
    const totalSemana = listTecnicos.reduce((acc, t) => acc + (t.total || 0), 0)

    useEffect(() => {
        const cargarSemanas = async () => {
            setLoading(true)
            setError(null)
            try {
                const semanas = await traerSemanas()
                setListSemanas(semanas || [])
                setListFiltrada(semanas || [])
            } catch (err) {
                console.error(err)
                setError("No se pudieron cargar las semanas")
            } finally {
                setLoading(false)
            }
        }
        cargarSemanas()
    }, [])

    const cargarTecnicosSemana = async (semana) => {
        setLoading(true)
        try {
            const datos = await traerTecnicosSemana(semana.id)
            setListTecnicos(datos || [])
            setListFiltrada(datos || [])
            setSemanaSeleccionada(semana)
            setVistaSemanas(false)
            setBusqueda("")
        } catch (err) {
            console.error(err)
            setError("No se pudo cargar el historial de técnicos")
        } finally {
            setLoading(false)
        }
    }

    const volverSemanas = () => {
        setVistaSemanas(true)
        setBusqueda("")
        setListFiltrada(listSemanas)
    }

    function filtrarHistorial(texto) {
        setBusqueda(texto)
        const palabras = texto.toLowerCase().trim().split(" ")
        const base = vistaSemanas ? listSemanas : listTecnicos
        const filtrados = base.filter(item => {
            const textoRegistro = `
                ${item.nombre || ""}
                ${item.fecha_inicio || ""}
                ${item.fecha_fin || ""}
                ${item.total_registros || ""}
                ${item.semana || ""}
            `.toLowerCase()
            return palabras.every(p => textoRegistro.includes(p))
        })
        setListFiltrada(filtrados)
    }

    async function handleEliminarSemana(semana_id) {
        try {
            closeModal()
            setLoading(true)
            await eliminarSemana(semana_id)
            const nuevasSemanas = listSemanas.filter(s => s.id !== semana_id)
            setListSemanas(nuevasSemanas)
            setListFiltrada(nuevasSemanas)
        } catch (err) {
            console.error(err)
            setError("Error eliminando semana")
        } finally {
            setLoading(false)
        }
    }

    async function handleEliminarTecnico(nombre) {
        try {
            closeModal()
            setLoading(true)
            await eliminarTecnicoSemana(nombre, semanaSeleccionada.id)
            const nuevaLista = listTecnicos.filter(t => t.nombre !== nombre)
            setListTecnicos(nuevaLista)
            setListFiltrada(nuevaLista)
        } catch (err) {
            console.error(err)
            setError("Error eliminando registros")
        } finally {
            setLoading(false)
        }
    }

    // ── Exportar Excel desde historial ─────────────────────────
    async function handleExportarExcel(tecnico) {
        try {
            setLoading(true)
            const registros = await getRegistrosPrevios(tecnico.nombre, tecnico.semana)
            if (!registros?.length) {
                openModal("SIN_REGISTROS")
                return
            }

            // El backend solo necesita id_registro para hacer la query
            // Mapeamos con los campos mínimos que valida SemanaTecnicoSchemaFront
            const registrosParaExportar = registros.map(r => ({
                id: String(r.id),
                id_registro: r.id,
                id_tecnico: r.tecnico_id,
                nombre: r.nombre,
                job: r.job ?? "",
                job_name: r.job_name ?? "",
                valor_servicio: r.valor_servicio ?? 0,
                porcentaje_tecnico: r.porcentaje_tecnico ?? 0,
                minimo: 0,
                opciones_pago: [],
                tipo_pago: r.tipo_pago ?? "CASH",
                valor_tarjeta: r.valor_tarjeta ?? 0,
                valor_efectivo: r.valor_efectivo ?? 0,
                porcentaje_cc: r.porcentaje_cc ?? 0,
                partes_gil: r.partes_gil ?? 0,
                partes_tecnico: r.partes_tecnico ?? 0,
                tech: r.tech ?? 0,
                subtotal: r.subtotal ?? 0,
                total: r.total ?? 0,
                adicional_dolar: 0,
                notas: [],
            }))

            const response = await exportarExcelDBPost(registrosParaExportar, tecnico.nombre, tecnico.semana)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${tecnico.nombre}_${tecnico.semana}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
        } catch (err) {
            console.error("Error exportando:", err)
            setError("Error exportando excel")
        } finally {
            setLoading(false)
        }
    }

    // ── Modal eliminar genérico ────────────────────────────────
    function abrirModalEliminar(tipo, accion) {
        setAccionPendiente(() => accion)
        openModal(tipo)
    }

    // ── Handlers modal agregar técnico ─────────────────────────
    const abrirModalAgregar = async () => {
        if (tecnicos.length === 0) {
            const data = await obtenerTecnicos()
            setTecnicos(data)
        }
        setBusquedaTecnico("")
        setIndexResaltado(-1)
        setModalAgregar(true)
    }

    const confirmarAgregarTecnico = () => {
        if (!tecnicoValido) return
        router.push(`/tecnico/${busquedaTecnico}/${semanaSeleccionada.semana}`)
    }

    const manejarTecladoModal = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setIndexResaltado(prev => prev < filtradosTecnicos.length - 1 ? prev + 1 : 0)
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            setIndexResaltado(prev => prev > 0 ? prev - 1 : filtradosTecnicos.length - 1)
        }
        if (e.key === "Enter") {
            e.preventDefault()
            if (indexResaltado >= 0 && filtradosTecnicos[indexResaltado]) {
                setBusquedaTecnico(filtradosTecnicos[indexResaltado])
                setIndexResaltado(-1)
            } else if (tecnicoValido) {
                confirmarAgregarTecnico()
            }
        }
        if (e.key === "Escape") setModalAgregar(false)
    }

    if (error) {
        return (
            <div className="w-full flex justify-center mt-20">
                <div className="bg-white/60 backdrop-blur-xl border border-red-200/50 rounded-2xl px-8 py-10 text-center max-w-sm">
                    <p className="text-rose-500 font-medium text-sm">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {loading && <LoadingOverlay />}

            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-200 flex justify-center px-4 py-8">
                <div className="w-full max-w-3xl flex flex-col gap-4">

                    {/* ===== HEADER ===== */}
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div>
                                    <h1 className="text-sm font-semibold text-slate-800">
                                        {vistaSemanas ? "Historial general" : `${semanaSeleccionada?.fecha_inicio} / ${semanaSeleccionada?.fecha_fin}`}
                                    </h1>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {vistaSemanas
                                            ? `${listFiltrada.length} semana${listFiltrada.length !== 1 ? "s" : ""}`
                                            : `${listFiltrada.length} técnico${listFiltrada.length !== 1 ? "s" : ""}`
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!vistaSemanas && (
                                    <>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50">
                                            <span className="text-[11px] text-slate-400">Total semana</span>
                                            <span className="text-sm font-bold text-indigo-600">
                                                ${formatearNumero(totalSemana)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={abrirModalAgregar}
                                            className="pointer flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-indigo-500/90 text-white font-medium shadow-sm hover:bg-indigo-500 active:scale-95 transition-all duration-200"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Agregar
                                        </button>
                                    </>
                                )}

                                {vistaSemanas ? (
                                    <Link
                                        href="/"
                                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Inicio
                                    </Link>
                                ) : (
                                    <button
                                        onClick={volverSemanas}
                                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Volver
                                    </button>
                                )}
                            </div>
                        </div>

                        <input
                            value={busqueda}
                            placeholder={vistaSemanas ? "Buscar semana..." : "Buscar técnico..."}
                            onChange={(e) => filtrarHistorial(e.target.value)}
                            className="w-full bg-white/50 border border-white/50 rounded-xl px-4 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white/70 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                    </div>

                    {/* ===== LISTA VACÍA ===== */}
                    {listFiltrada.length === 0 && !loading && (
                        <div className="text-center text-sm text-slate-400 py-12">
                            {vistaSemanas ? "No se encontraron semanas" : "No se encontraron técnicos para esta semana"}
                        </div>
                    )}

                    {/* ===== SEMANAS ===== */}
                    {vistaSemanas && (
                        <div className="flex flex-col gap-3">
                            {listFiltrada.map((semana) => (
                                <div key={semana.id} className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {semana.fecha_inicio} / {semana.fecha_fin}
                                            </p>
                                            {semana.total_tecnicos != null && (
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {semana.total_tecnicos} técnico{semana.total_tecnicos !== 1 ? "s" : ""}
                                                    {semana.total_registros != null && ` · ${semana.total_registros} registros`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => cargarTecnicosSemana(semana)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/60 border border-white/50 text-indigo-600 font-medium hover:bg-indigo-50/60 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => abrirModalEliminar("ELIMINAR_SEMANA", () => handleEliminarSemana(semana.id))}
                                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/60 border border-white/50 text-rose-400 hover:bg-rose-50/60 hover:text-rose-500 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ===== TÉCNICOS ===== */}
                    {!vistaSemanas && (
                        <div className="flex flex-col gap-3">
                            {listFiltrada.map((cart) => (
                                <div key={cart.id} className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{cart.nombre}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-semibold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-100/60">
                                                    ${formatearNumero(cart.total)}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {cart.total_registros} registro{cart.total_registros !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* ── Ver ── */}
                                            <button
                                                onClick={() => router.push(`/tecnico/${cart.nombre}/${cart.semana}`)}
                                                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/60 border border-white/50 text-indigo-600 font-medium hover:border-indigo-300 hover:bg-indigo-100 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Ver
                                            </button>

                                            {/* ── Exportar Excel ── */}
                                            <button
                                                onClick={() => handleExportarExcel(cart)}
                                                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/60 border border-white/50 text-green-600 font-medium hover:border-green-300 hover:bg-green-100 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Excel
                                            </button>

                                            {/* ── Eliminar ── */}
                                            <button
                                                onClick={() => abrirModalEliminar("ELIMINAR_TECNICO", () => handleEliminarTecnico(cart.nombre))}
                                                className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-xl bg-white/60 border border-white/50 text-rose-400 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-500 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== MODAL MANAGER ===== */}
            <ModalManager
                modal={modal}
                closeModal={closeModal}
                openModal={openModal}
                finalizarTabla={accionPendiente}
                exportarExcelDB={accionPendiente}
                setError={setError}
                setLoading={setLoading}
                nombre=""
            />

            {/* ===== MODAL AGREGAR TÉCNICO ===== */}
            <ModalAgregarTecnico
                isOpen={modalAgregar}
                onClose={() => setModalAgregar(false)}
                tecnicos={tecnicos}
                busquedaTecnico={busquedaTecnico}
                setBusquedaTecnico={setBusquedaTecnico}
                indexResaltado={indexResaltado}
                setIndexResaltado={setIndexResaltado}
                itemsRef={itemsRef}
                onConfirmar={confirmarAgregarTecnico}
                onKeyDown={manejarTecladoModal}
            />
        </>
    )
}