"use client";

import { useState, useEffect, useRef } from "react"
import { obtenerTecnicos } from "../Services/tencicosServices.js"
import { useRouter } from "next/navigation";
import { formatoFinal } from "../Utils/api.js"
import { LoadingOverlay } from "./loadingOverlay.jsx";

export default function SelectTecnicos() {
    const router = useRouter()
    const semanaActual = formatoFinal()
    const [tecnicos, setTecnicos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [errorInput, setErrorInput] = useState("")
    const [busqueda, setBusqueda] = useState("")
    const [mostrarList, setLista] = useState(false)
    const [indexResaltado, setIndexResaltado] = useState(-1)
    const listRef = useRef(null)
    const itemsRef = useRef([])

    const filtrados = tecnicos.filter((tec) =>
        tec.toLowerCase().startsWith(busqueda.toLowerCase())
    )

    const tecnicoValido = tecnicos.includes(busqueda.toUpperCase())

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await obtenerTecnicos()
                setTecnicos(data)
            } catch {
                setError("No se pudieron cargar los técnicos. Intente de nuevo.")
            } finally {
                setLoading(false)
            }
        }
        cargarDatos()
    }, [])

    useEffect(() => {
        if (indexResaltado >= 0 && itemsRef.current[indexResaltado]) {
            itemsRef.current[indexResaltado].scrollIntoView({
                block: "nearest",
                behavior: "smooth"
            })
        }
    }, [indexResaltado])

    if (error) {
        return (
            <div className="w-full flex justify-center">
                <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-red-300/40 rounded-3xl shadow-2xl px-10 py-16 text-center">
                    <p className="text-red-600 font-medium text-lg">{error}</p>
                </div>
            </div>
        )
    }

    async function handleConfirmar() {
        if (!tecnicoValido) {
            setErrorInput("Selecciona un técnico válido de la lista")
            return
        }
        setErrorInput("")
        router.push(`/tecnico/${busqueda}/${semanaActual}`)
    }

    function manejarSeleccion(nombre) {
        setBusqueda(nombre)
        setLista(false)
        setIndexResaltado(-1)
        setErrorInput("")
    }

    function manejarLista(valor) {
        setBusqueda(valor)
        setLista(true)
        setIndexResaltado(-1)
        if (valor === "") setErrorInput("")
    }

    function manejarTeclado(e) {
        if (!mostrarList || filtrados.length === 0) return

        if (e.key === "ArrowDown") {
            e.preventDefault()
            setIndexResaltado(prev =>
                prev < filtrados.length - 1 ? prev + 1 : 0
            )
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            setIndexResaltado(prev =>
                prev > 0 ? prev - 1 : filtrados.length - 1
            )
        }
        if (e.key === "Enter") {
            e.preventDefault()
            if (indexResaltado >= 0 && filtrados[indexResaltado]) {
                manejarSeleccion(filtrados[indexResaltado])
            } else if (tecnicoValido) {
                handleConfirmar()
            }
        }
        if (e.key === "Escape") {
            setLista(false)
            setIndexResaltado(-1)
        }
    }

    return (
        <>
            {loading && <LoadingOverlay />}

            <div className="relative w-full">

                <section className="
                    flex flex-col md:flex-row
                    items-stretch md:items-start
                    gap-3 md:gap-3
                    bg-white/60 backdrop-blur-xl
                    border border-white/40
                    rounded-2xl
                    shadow-xl
                    px-5 md:px-6
                    py-4 md:py-5
                    transition-all duration-300
                ">

                    <div className="flex-1 flex flex-col gap-1.5">
                        <div className="relative">
                            <input
                                type="text"
                                value={busqueda}
                                placeholder="Buscar técnico..."
                                onChange={(e) => manejarLista(e.target.value)}
                                onKeyDown={manejarTeclado}
                                onFocus={() => { if (busqueda !== "") setLista(true) }}
                                className={`
                                    w-full
                                    bg-white/50 backdrop-blur-md
                                    border rounded-xl
                                    px-4 py-2.5
                                    text-sm text-slate-700
                                    placeholder-slate-400
                                    outline-none
                                    focus:bg-white/70
                                    transition-all duration-200
                                    ${errorInput
                                        ? "border-rose-300/70 focus:ring-2 focus:ring-rose-200/50"
                                        : tecnicoValido
                                            ? "border-green-300/70 focus:ring-2 focus:ring-green-200/50"
                                            : "border-white/40 focus:ring-2 focus:ring-white/40"
                                    }
                                `}
                            />
                            {tecnicoValido && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {errorInput && (
                            <p className="text-[11px] text-rose-500 font-medium pl-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {errorInput}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.preventDefault(); handleConfirmar() }}
                        className={`
                            w-full md:w-auto
                            px-5 py-2.5
                            rounded-xl
                            text-sm font-semibold
                            shadow-md
                            active:scale-95
                            transition-all duration-200
                            cursor-pointer
                            ${tecnicoValido
                                ? "bg-indigo-500/90 backdrop-blur-xl text-white shadow-indigo-200/50 hover:bg-indigo-500"
                                : "bg-white/40 backdrop-blur-xl border border-white/40 text-slate-400 cursor-not-allowed"
                            }
                        `}
                    >
                        Confirmar
                    </button>

                </section>

                {mostrarList && (
                    <ul
                        ref={listRef}
                        className="
                            absolute
                            w-full
                            mt-2
                            bg-white/70 backdrop-blur-2xl
                            border border-white/50
                            rounded-2xl
                            shadow-2xl
                            overflow-auto
                            max-h-64
                            z-50
                        "
                    >
                        {filtrados.length === 0 ? (
                            <li className="text-center text-slate-400 py-8 text-sm select-none">
                                No se encontraron técnicos
                            </li>
                        ) : (
                            filtrados.map((nombre, i) => (
                                <li
                                    key={nombre}
                                    ref={el => itemsRef.current[i] = el}
                                    onClick={() => manejarSeleccion(nombre)}
                                    className={`
                                        px-5 py-3
                                        text-sm text-slate-700
                                        cursor-pointer
                                        transition-all duration-150
                                        flex items-center justify-between
                                        ${i < filtrados.length - 1 ? "border-b border-white/40" : ""}
                                        ${indexResaltado === i
                                            ? "bg-indigo-50/80 text-indigo-700"
                                            : "hover:bg-white/60"
                                        }
                                    `}
                                >
                                    <span className="font-medium">{nombre}</span>
                                    {indexResaltado === i && (
                                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                )}

                {mostrarList && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => { setLista(false); setIndexResaltado(-1) }}
                    />
                )}

            </div>
        </>
    )
}