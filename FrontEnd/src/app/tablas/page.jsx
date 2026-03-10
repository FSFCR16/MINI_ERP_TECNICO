"use client"

import { useEffect, useState } from "react"
import { traerSemanas, traerTecnicosSemana } from "../../Services/tencicosServices.js"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { useRouter } from "next/navigation"
export default function Page() {

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [vistaSemanas, setVistaSemanas] = useState(true)

    const [listSemanas, setListSemanas] = useState([])
    const [listTecnicos, setListTecnicos] = useState([])

    const [listFiltrada, setListFiltrada] = useState([])

    const [busqueda, setBusqueda] = useState("")
    const [semanaSeleccionada, setSemanaSeleccionada] = useState(null)
    const router = useRouter()
    const esTouch = typeof window !== "undefined" && 'ontouchstart' in window

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
                                    {totalSemana}
                                </span>

                            </div>

                            <button
                                onClick={volverSemanas}
                                className="
                                flex items-center gap-2
                                px-4 py-2
                                rounded-xl
                                bg-white/40
                                backdrop-blur-md
                                border border-white/40
                                text-sm font-medium
                                text-slate-700
                                hover:bg-white/60
                                hover:scale-[1.02]
                                transition-all
                                cursor-pointer
                                "
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
                        className="
                        w-full
                        bg-white/50
                        backdrop-blur-md
                        border border-white/40
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        text-slate-700
                        placeholder-slate-400
                        outline-none
                        focus:bg-white/70
                        focus:ring-2 focus:ring-indigo-200
                        transition-all
                        "
                    />

                </div>



                {/* ================= VISTA SEMANAS ================= */}

                {vistaSemanas && (

                    <div className="space-y-3">

                        {listFiltrada.map((semana, index)=>{

                            return (

                                <div

                                    key={index}

                                    {...(esTouch
                                        ? { onClick: () => cargarTecnicosSemana(semana) }
                                        : { onDoubleClick: () => cargarTecnicosSemana(semana) }
                                    )}

                                    className="
                                    flex justify-between items-center
                                    px-5 py-4
                                    rounded-2xl
                                    bg-white/40
                                    backdrop-blur-xl
                                    border border-white/40
                                    hover:bg-white/55
                                    hover:scale-[1.01]
                                    transition
                                    cursor-pointer
                                    "

                                >

                                    <div>

                                        <p className="text-base sm:text-lg font-semibold text-slate-800">

                                            {semana.fecha_inicio} / {semana.fecha_fin}

                                        </p>

                                    </div>

                                </div>

                            )

                        })}

                    </div>

                )}



                {/* ================= VISTA TECNICOS ================= */}

                {!vistaSemanas && (

                    <div className="space-y-3">

                        {listFiltrada.map((cart, indexCart) => (

                            <div

                                key={`${cart.nombre}-${indexCart}`}
                                className="
                                flex justify-between items-center
                                px-5 py-4
                                rounded-2xl
                                bg-white/40
                                backdrop-blur-xl
                                border border-white/40
                                hover:bg-white/55
                                transition
                                cursor-pointer
                                "
                                onDoubleClick={() => {
                                    router.push(`/tecnico/${cart.nombre}/${cart.semana}`)
                                }}
                            >

                                <div>

                                    <p className="text-base sm:text-lg font-semibold text-slate-800">

                                        {cart.nombre}

                                    </p>

                                </div>



                                <div className="flex gap-3">

                                    <div className="px-3 py-1.5 rounded-xl bg-white/30 border border-white/40 text-center">

                                        <p className="text-sm font-semibold text-slate-800">

                                            {cart.total}

                                        </p>

                                        <p className="text-[10px] text-slate-500">

                                            total

                                        </p>

                                    </div>

                                    <div className="px-3 py-1.5 rounded-xl bg-white/30 border border-white/40 text-center">

                                        <p className="text-sm font-semibold text-slate-800">

                                            {cart.total_registros}

                                        </p>

                                        <p className="text-[10px] text-slate-500">

                                            registros

                                        </p>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>

        </>
    )

}