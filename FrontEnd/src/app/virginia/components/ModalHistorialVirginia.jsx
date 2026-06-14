"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { vaHistorialTecnico } from "@/Services/virginiaServices"

// Modal de Historial de Virginia (equivalente al del general): lista las semanas
// donde el técnico tiene registros y navega a esa semana.
export function ModalHistorialVirginia({ nombre, onClose }) {
    const [historial, setHistorial] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const [cargando, setCargando] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const cargar = async () => {
            setCargando(true)
            try {
                const data = await vaHistorialTecnico(nombre)
                setHistorial(data ?? [])
            } catch (e) {
                console.error(e)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [nombre])

    const palabras = busqueda.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const filtrado = historial.filter((s) => {
        const txt = `${s.fecha_inicio} ${s.fecha_fin} ${s.semana} ${s.total_registros}`.toLowerCase()
        return palabras.every((p) => txt.includes(p))
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-base font-semibold text-slate-800 mb-4">Historial</h2>

                <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar semana..."
                    className="w-full px-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white/90 mb-4"
                />

                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                    {cargando ? (
                        <p className="text-center text-sm text-slate-400 py-6">Cargando…</p>
                    ) : filtrado.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 py-6">No se encontraron semanas</p>
                    ) : (
                        filtrado.map((s) => (
                            <div
                                key={s.semana_id}
                                onClick={() => { router.push(`/virginia/${encodeURIComponent(nombre)}/${s.semana}`); onClose() }}
                                className="cursor-pointer rounded-xl border border-white/50 bg-white/60 p-3 shadow-md hover:bg-white/80 active:scale-[0.98] transition-all"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-800">{s.fecha_inicio} / {s.fecha_fin}</span>
                                    <span className="text-xs text-slate-500">{s.total_registros} registros</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white active:scale-95 transition cursor-pointer">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}
