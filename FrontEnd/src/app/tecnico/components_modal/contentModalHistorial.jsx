"use client"
import { obtenerHistorial} from "../../../Services/tencicosServices.js"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { DialogTitle } from '@headlessui/react'

export function ModalHistorial({title,setIsOpen,setError,nombre,setLoading}) {
    const [historialOriginal, setHistorialOriginal] = useState([])
    const [historialFiltrado, setHistorialFiltrado] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const router = useRouter()

    useEffect(() => {

        const cargarHistorial = async () => {
            try {
                setLoading(true)
                setError(null)

                const historialTecnico = await obtenerHistorial(nombre)
                setHistorialOriginal(historialTecnico)
                setHistorialFiltrado(historialTecnico)

            } catch (err) {
                setError("Error cargando historial")
                console.error(err)

            }finally{
                setLoading(false)
            }
        }
        cargarHistorial()
    }, [nombre])

    function filtrarHistorial(texto) {

        const palabras = texto
        .toLowerCase()
        .trim()
        .split(" ")

        const filtrados = historialOriginal.filter(item => {

            const textoRegistro = `
                ${item.nombre}
                ${item.fecha_inicio}
                ${item.fecha_fin}
                ${item.total_registros}
            `.toLowerCase()

            return palabras.every(p =>
                textoRegistro.includes(p)
            )

        })

        setHistorialFiltrado(filtrados)

    }
    return (
        <>
            <DialogTitle className="text-base font-semibold text-slate-800 mb-4">
                {title}
            </DialogTitle>

            {/* BUSCADOR */}

            <div className="mb-4">
                <input
                    value={busqueda}
                    onChange={(e)=>{
                        const texto = e.target.value
                        setBusqueda(texto)
                        filtrarHistorial(texto)
                    }}
                    placeholder="Buscar semana..."
                    className="
                    w-full
                    px-4 py-2
                    rounded-xl
                    bg-white/60
                    backdrop-blur-xl
                    border border-white/40
                    text-sm
                    text-slate-700
                    placeholder-slate-400
                    shadow-inner
                    focus:outline-none
                    focus:ring-2
                    focus:ring-sky-400/50
                    "
                />
            </div>

            {/* LISTA */}

            <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">

                {historialFiltrado.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-6">
                        No se encontraron semanas
                    </div>
                )}

                {historialFiltrado.map((semana)=>(
                    <div
                        key={semana.semana_id}
                        onClick={() => {
                            router.push(`/tecnico/${nombre}/${semana.semana}`)
                            setIsOpen(false)
                        }}
                        className="
                        cursor-pointer
                        rounded-xl
                        border border-white/40
                        bg-white/60
                        backdrop-blur-xl
                        p-3
                        shadow-md
                        hover:bg-white/80
                        active:scale-[0.98]
                        transition-all
                        "
                    >

                        <div className="flex justify-between items-center">

                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800">
                                    {semana.fecha_inicio} / {semana.fecha_fin}
                                </span>

                                <span className="text-xs text-slate-500">
                                    {semana.total_registros} registros
                                </span>

                            </div>

                        </div>

                    </div>
                ))}

            </div>

            {/* BOTON CANCELAR */}

            <div className="mt-6 flex justify-end">

                <button
                onClick={()=>setIsOpen(false)}
                className="
                cursor-pointer
                px-4 py-1.5
                text-sm
                rounded-xl
                bg-white/50
                backdrop-blur-xl
                border border-white/40
                text-rose-500
                font-medium
                shadow-md
                hover:bg-white
                hover:shadow-lg
                active:scale-95
                transition-all
                duration-200
                "
                >
                Cancelar
                </button>

            </div>

        </>
    )
}
