"use client";

import { useState } from "react"
import { useEffect } from "react"
import {obtenerTecnicos, confirmarTecnico} from "../Services/tencicosServices.js"
import { useRouter } from "next/navigation";
import {formatoFinal} from "../Utils/api.js"

export default function SelectTecnicos(){
    const router = useRouter()
    const semanaActual =  formatoFinal()
    const [tecnicos, setTecnicos] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingConfirm, setLoadingConfirm] = useState(false);
    const [error, setError] = useState(null)
    const [busqueda, setBusqueda] = useState("")
    const [mostrarList, setLista]=useState(true)
    const filtrados = tecnicos.filter((tec) =>
        tec.toLowerCase().startsWith((busqueda.toLowerCase()))
    )
    useEffect(() => {
    const cargarDatos = async () => {
        try {
            const data = await obtenerTecnicos()
            setTecnicos(data)
            // guardar datos
        } catch {
            setError("Mensaje de error")
        } finally {
            setLoading(false)
        }
    }
    cargarDatos()
    }, [])

    
    if (loading) {
        
    return (
        <div className="w-full flex justify-center">
        <div
            className="
            w-full max-w-2xl
            bg-white/60 backdrop-blur-xl
            border border-white/40
            rounded-3xl
            shadow-2xl
            px-10 py-16
            text-center
            "
        >
            <div className="animate-pulse text-slate-700 text-lg font-medium">
            Cargando...
            </div>
        </div>
        </div>
    );
    }

    if (error) {
    return (
        <div className="w-full flex justify-center">
        <div
            className="
            w-full max-w-2xl
            bg-white/60 backdrop-blur-xl
            border border-red-300/40
            rounded-3xl
            shadow-2xl
            px-10 py-16
            text-center
            "
        >
            <p className="text-red-600 font-medium text-lg">
            {error}
            </p>
        </div>
        </div>
    );
    }

    async function handleConfirmar() {
        if (!tecnicos.includes(busqueda.toUpperCase())) return alert("Seleccione un técnico");

        setLoadingConfirm(true);
        try {
            router.push(`/tecnico/${busqueda}/${semanaActual}`);
        } catch (e) {
            console.error("Error al confirmar:", e);
        } finally {
            setLoadingConfirm(false);
        }
    }

    function manejarSeleccion(e){
        setBusqueda(e)
        setLista(false)
    }

    function manejarLista(e){
        setBusqueda(e)
        setLista(true) 
    }
    return (
        <div className="relative w-full">

            {/* Card glass */}
            <section
            className="
                flex flex-col md:flex-row
                items-stretch md:items-center
                gap-3 md:gap-4
                bg-white/60 backdrop-blur-xl
                border border-white/40
                rounded-2xl
                shadow-xl
                px-5 md:px-6
                py-4 md:py-5
                transition-all duration-300
            "
            >

                <input
                    type="text"
                    value={busqueda}
                    placeholder="Escriba el nombre del técnico..."
                    onChange={(e) => manejarLista(e.target.value)}
                    className="
                    flex-1
                    bg-white/50 backdrop-blur-md
                    border border-white/40
                    rounded-xl
                    px-4
                    py-2.5
                    text-sm md:text-base
                    text-slate-700
                    placeholder-slate-400
                    outline-none
                    focus:bg-white/70
                    focus:ring-2 focus:ring-white/40
                    transition-all duration-200
                    "
                />

                <button
                    onClick={(e) => {
                    e.preventDefault();
                    handleConfirmar();
                    }}
                    className="
                    w-full md:w-auto
                    px-5
                    py-2.5
                    rounded-xl
                    bg-white/30 backdrop-blur-xl
                    border border-white/30
                    text-sm
                    text-slate-800 font-medium
                    shadow-md
                    hover:bg-gradient-to-br
                    hover:from-slate-200
                    hover:via-blue-200
                    hover:to-indigo-200
                    hover:text-slate-900
                    hover:shadow-lg
                    active:scale-95
                    transition-all duration-300 ease-out
                    cursor-pointer
                    "
                >
                    CONFIRMAR
                </button>

                <button
                    onClick={() => router.push("/tablas")}
                    className="
                    w-full md:w-auto
                    px-5
                    py-2.5
                    rounded-xl
                    bg-white/30 backdrop-blur-xl
                    border border-white/30
                    text-sm
                    text-slate-800 font-medium
                    shadow-md
                    hover:bg-gradient-to-br
                    hover:from-slate-200
                    hover:via-blue-200
                    hover:to-indigo-200
                    hover:text-slate-900
                    hover:shadow-lg
                    active:scale-95
                    transition-all duration-300 ease-out
                    cursor-pointer
                    "
                >
                    TABLAS
                </button>

            </section>

            {(mostrarList && busqueda !== "") && (
            <ul
                className="
                absolute
                w-full
                mt-4 md:mt-6
                bg-white/60 backdrop-blur-2xl
                border border-white/40
                rounded-3xl
                shadow-2xl
                overflow-hidden
                z-20"
            >
                {filtrados.length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm">
                        No se encontraron técnicos
                    </div>
                )}
                {filtrados.map((e) => (
                <li
                    key={e}
                    onClick={() => manejarSeleccion(e)}
                    className="
                    px-6 md:px-6
                    py-3 md:py-3
                    text-slate-800
                    text-base md:text-lg
                    cursor-pointer
                    transition-all duration-200
                    hover:bg-gradient-to-r hover:from-slate-200 hover:to-blue-200
                    hover:text-slate-900
                    active:scale-[0.98]"
                >
                    {e}
                </li>
                ))}
            </ul>
            )}

        </div>
    );
    
}
