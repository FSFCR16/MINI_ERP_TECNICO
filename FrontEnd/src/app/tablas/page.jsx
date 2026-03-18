"use client"

import { useEffect, useState, Fragment, useRef } from "react"
import { traerSemanas, traerTecnicosSemana, eliminarSemana, eliminarTecnicoSemana } from "../../Services/tencicosServices.js"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { useRouter } from "next/navigation"
import { DialogPanel, Transition, TransitionChild, Dialog } from '@headlessui/react'
import { ContentNoList } from '../tecnico/components_modal/content_noList.jsx'
import { formatearNumero } from "@/Utils/api.js"

export default function Page() {

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [vistaSemanas, setVistaSemanas] = useState(true)
    const [listSemanas, setListSemanas] = useState([])
    const [listTecnicos, setListTecnicos] = useState([])
    const [modalAction, setModalAction] = useState(null)
    const [listFiltrada, setListFiltrada] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [semanaSeleccionada, setSemanaSeleccionada] = useState(null)
    const [isOpen, setIsOpen] = useState(false)
    const [modalTipo, setModalTipo] = useState(null)
    const router = useRouter()

    const totalSemana = listTecnicos.reduce((acc, t) => acc + (t.total || 0), 0)

    const configModal = {
        "ELIMINAR_SEMANA": {
            title: "ELIMINAR SEMANA",
            message: "Esta acción eliminará todos los registros de la semana. ¿Desea continuar?",
            confirmText: "ELIMINAR",
            cancelText: "CANCELAR",
            showBtn: true,
            modalRender: 1,
            hasFunction: true,
        },
        "ELIMINAR_TECNICO": {
            title: "ELIMINAR REGISTROS",
            message: "Se eliminarán todos los registros del técnico en esta semana.",
            confirmText: "ELIMINAR",
            cancelText: "CANCELAR",
            showBtn: true,
            modalRender: 1,
            hasFunction: true,
        },
    }

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
            setIsOpen(false)
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
            setIsOpen(false)
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
                                {!vistaSemanas && (
                                    <button
                                        onClick={volverSemanas}
                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/60 border border-white/50 text-slate-500 hover:bg-white/80 active:scale-95 transition"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}
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

                            {!vistaSemanas && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50">
                                    <span className="text-[11px] text-slate-400">Total semana</span>
                                    <span className="text-sm font-bold text-indigo-600">
                                        ${formatearNumero(totalSemana)}
                                    </span>
                                </div>
                            )}
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
                                <div
                                    key={semana.id}
                                    className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between gap-4 flex-wrap">

                                        {/* Info — solo texto, sin click */}
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

                                        {/* Acciones */}
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

                                            {/* Eliminar — solo ícono */}
                                            <button
                                                onClick={() => {
                                                    setModalAction(() => () => handleEliminarSemana(semana.id))
                                                    setModalTipo("ELIMINAR_SEMANA")
                                                    setIsOpen(true)
                                                }}
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
                                <div
                                    key={cart.id}
                                    className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between gap-4 flex-wrap">

                                        {/* Info — solo texto, sin click */}
                                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {cart.nombre}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-semibold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-100/60">
                                                    ${formatearNumero(cart.total)}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {cart.total_registros} registro{cart.total_registros !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => router.push(`/tecnico/${cart.nombre}/${cart.semana}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/60 border border-white/50 text-indigo-600 font-medium hover:bg-indigo-50/60 active:scale-95 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Ver
                                            </button>

                                            {/* Eliminar — solo ícono */}
                                            <button
                                                onClick={() => {
                                                    setModalAction(() => () => handleEliminarTecnico(cart.nombre))
                                                    setModalTipo("ELIMINAR_TECNICO")
                                                    setIsOpen(true)
                                                }}
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

                </div>
            </div>

            {/* ===== MODAL ===== */}
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </TransitionChild>
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40">
                                {configModal[modalTipo]?.modalRender === 1 && (
                                    <ContentNoList
                                        message={configModal[modalTipo].message}
                                        title={configModal[modalTipo].title}
                                        btnTextCancel={configModal[modalTipo].cancelText}
                                        btnTextConfirm={configModal[modalTipo].confirmText}
                                        setIsOpen={setIsOpen}
                                        hasFunction={true}
                                        functionAction={modalAction}
                                        showBtn={true}
                                    />
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}