"use client"
import { useState } from "react"
export function BuscadorRegistros({ registros, onFiltrar }) {
    const [busqueda, setBusqueda] = useState("")

    const handleChange = (texto) => {
        setBusqueda(texto)
        if (!texto.trim()) {
            onFiltrar(null)  // 👈 null = sin filtro, muestra todos
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

    return (
        <div className="relative w-full">
            <input
                value={busqueda}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-white/50 rounded-xl pl-8 pr-8 py-1.5 text-[11px] text-slate-600 placeholder-slate-300 outline-none focus:bg-white/80 transition-all border border-white/60 focus:border-indigo-200/60"
            />
            {busqueda && (
                <button
                    onClick={() => handleChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}