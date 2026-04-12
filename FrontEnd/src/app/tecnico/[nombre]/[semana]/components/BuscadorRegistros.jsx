"use client"
import { useState, useRef } from "react"

export function BuscadorRegistros({ registros, onFiltrar }) {
    const [busqueda, setBusqueda] = useState("")
    const [enfocado, setEnfocado] = useState(false)
    const inputRef = useRef(null)

    const handleChange = (texto) => {
        setBusqueda(texto)
        if (!texto.trim()) {
            onFiltrar(null)
            return
        }
        const palabras = texto.toLowerCase().trim().split(/\s+/)
        const filtrados = registros.filter(row => {
            const textoFila = Object.values(row)
                .filter(v => v !== null && v !== undefined)
                .join(" ")
                .toLowerCase()
            return palabras.every(p => textoFila.includes(p))
        })
        onFiltrar(filtrados)
    }

    const limpiar = () => {
        handleChange("")
        inputRef.current?.focus()
    }

    return (
        <div
            className={`
                relative flex items-center gap-2 w-full
                px-3 py-1.5 rounded-xl
                border transition-all duration-200
                ${enfocado
                    ? "bg-white/80 border-indigo-200/70 shadow-sm shadow-indigo-100/50"
                    : "bg-white/50 border-white/60 hover:bg-white/65 hover:border-white/80"
                }
            `}
        >
            {/* Icono lupa */}
            <svg
                className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${enfocado ? "text-indigo-400" : "text-slate-300"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>

            <input
                ref={inputRef}
                value={busqueda}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setEnfocado(true)}
                onBlur={() => setEnfocado(false)}
                placeholder="Buscar..."
                className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-300 outline-none min-w-0"
            />

            {/* Contador de resultados */}
            {busqueda && (
                <span className="text-[10px] font-semibold text-indigo-400/80 shrink-0 tabular-nums">
                    {registros.filter(row => {
                        const palabras = busqueda.toLowerCase().trim().split(/\s+/)
                        const textoFila = Object.values(row)
                            .filter(v => v !== null && v !== undefined)
                            .join(" ").toLowerCase()
                        return palabras.every(p => textoFila.includes(p))
                    }).length}
                </span>
            )}

            {/* Botón limpiar */}
            {busqueda && (
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={limpiar}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200/80 hover:bg-slate-300/80 transition-colors duration-150"
                >
                    <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}