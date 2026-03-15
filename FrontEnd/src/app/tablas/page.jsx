"use client"

import { useEffect, useState,Fragment,useRef } from "react"
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
    const [modalAction,setModalAction] = useState(null)
    const [listFiltrada, setListFiltrada] = useState([])
    const [menuAbierto, setMenuAbierto] = useState(null)
    const [busqueda, setBusqueda] = useState("")
    const [semanaSeleccionada, setSemanaSeleccionada] = useState(null)
    const router = useRouter()
    const esTouch = typeof window !== "undefined" && 'ontouchstart' in window
    const [isOpen, setIsOpen] = useState(false)
    const [modalTipo, setModalTipo] = useState(null)

    const totalSemana = listTecnicos.reduce((acc, t) => acc + (t.total || 0), 0)

    const configModal={
        "ELIMINAR_SEMANA":{
            title:"ELIMINAR SEMANA",
            message:"Esta acción eliminará todos los registros de la semana. ¿Desea continuar?",
            confirmText:"ELIMINAR",
            cancelText:"CANCELAR",
            showBtn:true,
            modalRender:1,
            hasFunction:true,
            functionName:null
        },

        "ELIMINAR_TECNICO":{
            title:"ELIMINAR REGISTROS",
            message:"Se eliminarán todos los registros del técnico en esta semana.",
            confirmText:"ELIMINAR",
            cancelText:"CANCELAR",
            showBtn:true,
            modalRender:1,
            hasFunction:true,
            functionName:null
        },
    }

    useEffect(() => {

        const cargarSemanas = async () => {

            setLoading(true)
            setError(null)

            try {

                const semanas = await traerSemanas()
                console.log(semanas)
                setListSemanas(semanas || [])
                setListFiltrada(semanas || [])
                console.log(semanas)

            } catch (err) {

                console.error(err)
                setError("No se pudieron cargar las semanas")

            } finally {

                setLoading(false)

            }

        }

        cargarSemanas()

    }, [])

    useEffect(()=>{
        setMenuAbierto(null)
    },[vistaSemanas])    

    const menuRef = useRef(null)

        useEffect(()=>{

            function cerrar(e){
                if(menuRef.current && !menuRef.current.contains(e.target)){
                setMenuAbierto(null)
                }
            }

            document.addEventListener("mousedown", cerrar)

            return ()=>document.removeEventListener("mousedown", cerrar)

    },[])

    const cargarTecnicosSemana = async (semana) => {

        setLoading(true)

        try {

            const datos = await traerTecnicosSemana(semana.id)
            console.log(datos)
            setListTecnicos(datos || [])
            setListFiltrada(datos || [])

            setSemanaSeleccionada(semana)
            setVistaSemanas(false)

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

        const palabras = texto
        .toLowerCase()
        .trim()
        .split(" ")

        const base = vistaSemanas ? listSemanas : listTecnicos

        const filtrados = base.filter(item => {

            const textoRegistro = `
                ${item.nombre || ""}
                ${item.fecha_inicio || ""}
                ${item.fecha_fin || ""}
                ${item.total_registros || ""}
                ${item.semana || ""}
            `.toLowerCase()

            return palabras.every(p =>
                textoRegistro.includes(p)
            )

        })

        setListFiltrada(filtrados)

    }

    async function handleEliminarSemana(semana_id) {

        try {
            setIsOpen(false)
            setLoading(true)
            console.log(semana_id)
            await eliminarSemana(semana_id)

            const nuevasSemanas = listSemanas.filter(
                s => s.id !== semana_id
            )

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

            const nuevaLista = listTecnicos.filter(
                t => t.nombre !== nombre
            )

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
                <p className="text-red-600">{error}</p>
            </div>
        )

    }

    console.log(listFiltrada)
    return (

            <>
                    {loading && <LoadingOverlay />}

                        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-200 flex justify-center px-4 py-10">

                            <div className="w-full max-w-3xl flex flex-col gap-6">

                                {/* HEADER */}

                                <div className="text-center">

                                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">

                                        {vistaSemanas ? "Historial General" : "Técnicos de la Semana"}

                                    </h1>

                                    {!vistaSemanas && (

                                    <div className="flex flex-col items-center gap-2 mt-2">

                                        <p className="text-sm text-slate-600">

                                        {semanaSeleccionada.fecha_inicio} / {semanaSeleccionada.fecha_fin}

                                        </p>

                                        <div className="flex gap-3 items-center">

                                            <span className="text-xs text-slate-500">
                                            Total semana
                                            </span>

                                            <span className="px-3 py-1 rounded-xl bg-white/40 border border-white/40 text-sm font-semibold text-slate-700">
                                            {formatearNumero(totalSemana)}
                                            </span>

                                        </div>

                                        <button
                                        onClick={volverSemanas}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/40 backdrop-blur-md border border-white/40 text-sm font-medium text-slate-700 hover:bg-white/60 hover:scale-[1.02] transition-all cursor-pointer"
                                        >
                                        <span className="text-base">←</span>
                                        Volver a semanas
                                        </button>

                                    </div>

                                    )}

                                </div>

                                {/* BUSCADOR */}

                                <div className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-2xl p-3 shadow-md">

                                    <input
                                    value={busqueda}
                                    placeholder={vistaSemanas ? "Buscar semana..." : "Buscar técnico..."}
                                    onChange={(e)=>filtrarHistorial(e.target.value)}
                                    className="w-full bg-white/50 backdrop-blur-md border border-white/40 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white/70 focus:ring-2 focus:ring-indigo-200 transition-all"
                                    />

                                </div>

                                {/* ================= SEMANAS ================= */}
                                {listFiltrada.length === 0 && (
                                    <div className="text-center text-sm text-slate-500 py-6">
                                        {vistaSemanas ? "No se encontraron semanas":"No se encontraron tecnicos para esta semana"}
                                    </div>
                                )}
                                {vistaSemanas && (
                                    <div className="space-y-3">
                                    {listFiltrada.map((semana)=> (

                                        <div
                                        key={semana.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/40 hover:bg-white/70 hover:shadow-md transition"
                                        >

                                        {/* INFO */}
                                            <div
                                            {...(esTouch
                                            ? { onClick: () => cargarTecnicosSemana(semana) }
                                            : { onDoubleClick: () => cargarTecnicosSemana(semana) }
                                            )}
                                            className="cursor-pointer flex-1"
                                            >

                                                <p className="text-lg font-semibold text-slate-800">
                                                {semana.fecha_inicio} / {semana.fecha_fin}
                                                </p>

                                            </div>


                                            {/* ACCIONES */}
                                            <div className="flex gap-3">

                                                <button
                                                onClick={()=>cargarTecnicosSemana(semana)}
                                                className="px-4 py-2 text-sm rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium transition"
                                                >
                                                Ver técnicos
                                                </button>

                                                <button
                                                onClick={(e)=>{
                                                e.stopPropagation()
                                                setModalAction(()=>()=>handleEliminarSemana(semana.id))
                                                setModalTipo("ELIMINAR_SEMANA")
                                                setIsOpen(true)
                                                }}
                                                className="px-4 py-2 text-sm rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-medium transition"
                                                >
                                                Eliminar
                                                </button>

                                            </div>

                                        </div>

                                    ))}

                                    </div>

                                )}

                                {/* ================= TECNICOS ================= */}

                                {!vistaSemanas && (

                                <div className="space-y-4">

                                    {listFiltrada.map((cart)=> (

                                    <div
                                        key={cart.id}
                                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/40 hover:bg-white/70 transition shadow-sm"
                                    >

                                        {/* INFO PRINCIPAL */}
                                        <div
                                        onDoubleClick={()=>{
                                            router.push(`/tecnico/${cart.nombre}/${cart.semana}`)
                                        }}
                                        className="flex flex-col gap-2 cursor-pointer flex-1"
                                        >

                                        <p className="text-lg font-semibold text-slate-800 tracking-tight">
                                            {cart.nombre}
                                        </p>

                                        <div className="flex items-center gap-4 text-sm">

                                            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
                                            <span className="font-semibold text-indigo-700">
                                                {formatearNumero(cart.total)}
                                            </span>
                                            <span className="text-xs text-indigo-500">
                                                total
                                            </span>
                                            </div>

                                            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                            <span className="font-semibold text-slate-700">
                                                {cart.total_registros}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                registros
                                            </span>
                                            </div>

                                        </div>

                                        </div>


                                        {/* ACCIONES */}
                                        <div className="flex items-center gap-3">

                                        {/* VER */}
                                        <button
                                            onClick={()=>router.push(`/tecnico/${cart.nombre}/${cart.semana}`)}
                                            className="px-4 py-2 text-sm rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium transition"
                                        >
                                            Ver registros
                                        </button>

                                        {/* ELIMINAR */}
                                        <button
                                            onClick={(e)=>{
                                            e.stopPropagation()
                                            setModalAction(()=>()=>handleEliminarTecnico(cart.nombre))
                                            setModalTipo("ELIMINAR_TECNICO")
                                            setIsOpen(true)
                                            }}
                                            className="px-4 py-2 text-sm rounded-xl bg-red-100 hover:bg-red-200 text-red-600 font-medium transition"
                                        >
                                            Eliminar
                                        </button>

                                        </div>

                                    </div>

                                    ))}

                                </div>

                                )}

                            </div>

                        </div>

                        {/* ===================== MODAL ===================== */}

                        <Transition appear show={isOpen} as={Fragment}>
                            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>

                            <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                            >

                                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

                            </Transition.Child>

                                <div className="fixed inset-0 flex items-center justify-center p-4">

                                    <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-200"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-150"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
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

                                    </Transition.Child>

                                </div>

                            </Dialog>

                        </Transition>

            </>

        )
}