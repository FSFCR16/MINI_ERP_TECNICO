"use client"
import { useState, useEffect, useCallback } from "react"

// Panel CRUD de notas reutilizable por ambos módulos (general y Virginia).
// Solo cambia el objeto `services` (qué endpoints pega) y los `defaults`.
//
// props:
//   nombre, semana   → identidad (técnico + semana)
//   defaults         → array de strings; notas predeterminadas a sembrar la 1ª vez
//   services         → { listar(nombre,semana), seed(nombre,semana,notas),
//                        crear(nombre,semana,texto,orden), actualizar(id,texto), eliminar(id) }
//   onClose          → cerrar
export function NotasPanel({ nombre, semana, defaults = [], services, onClose }) {
    const [notas, setNotas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [nueva, setNueva] = useState("")
    const [editId, setEditId] = useState(null)
    const [editTexto, setEditTexto] = useState("")
    const [busy, setBusy] = useState(false)

    const cargar = useCallback(async () => {
        setCargando(true)
        setError(null)
        try {
            let lista = await services.listar(nombre, semana)
            if ((!lista || lista.length === 0) && defaults.length > 0) {
                lista = await services.seed(nombre, semana, defaults)
            }
            setNotas(lista ?? [])
        } catch (e) {
            console.error(e)
            setError("No se pudieron cargar las notas")
        } finally {
            setCargando(false)
        }
    }, [nombre, semana, services]) // defaults se evalúa solo en la 1ª carga (sin notas)

    useEffect(() => { cargar() }, [cargar])

    const agregar = async () => {
        const texto = nueva.trim()
        if (!texto || busy) return
        setBusy(true)
        try {
            const n = await services.crear(nombre, semana, texto, notas.length)
            setNotas((prev) => [...prev, n])
            setNueva("")
        } catch (e) { console.error(e); setError("No se pudo agregar la nota") }
        finally { setBusy(false) }
    }

    const empezarEdicion = (n) => { setEditId(n.id); setEditTexto(n.texto) }

    const guardarEdicion = async () => {
        const texto = editTexto.trim()
        if (!texto) { setEditId(null); return }
        setBusy(true)
        try {
            const n = await services.actualizar(editId, texto)
            setNotas((prev) => prev.map((x) => (x.id === editId ? n : x)))
            setEditId(null)
        } catch (e) { console.error(e); setError("No se pudo editar la nota") }
        finally { setBusy(false) }
    }

    const eliminar = async (id) => {
        setBusy(true)
        try {
            await services.eliminar(id)
            setNotas((prev) => prev.filter((x) => x.id !== id))
        } catch (e) { console.error(e); setError("No se pudo eliminar la nota") }
        finally { setBusy(false) }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Notas</h2>
                <span className="text-[11px] text-slate-400">{notas.length} nota{notas.length !== 1 ? "s" : ""}</span>
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <div className="flex flex-col gap-1.5 max-h-[45vh] overflow-auto custom-scroll pr-1">
                {cargando ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Cargando…</p>
                ) : notas.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Sin notas. Agregá la primera abajo.</p>
                ) : (
                    notas.map((n, i) => (
                        <div key={n.id} className="group flex items-start gap-2 px-3 py-2 rounded-xl bg-white/60 border border-white/50">
                            <span className="text-[11px] font-semibold text-slate-400 mt-0.5 select-none">{i + 1}.</span>
                            {editId === n.id ? (
                                <>
                                    <input
                                        autoFocus
                                        value={editTexto}
                                        onChange={(e) => setEditTexto(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") guardarEdicion(); if (e.key === "Escape") setEditId(null) }}
                                        className="flex-1 bg-white/80 border border-indigo-300/60 rounded-lg px-2 py-1 text-sm outline-none"
                                    />
                                    <button onClick={guardarEdicion} disabled={busy} className="text-green-600 hover:text-green-700 text-xs font-semibold px-1 cursor-pointer">Guardar</button>
                                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer">Cancelar</button>
                                </>
                            ) : (
                                <>
                                    <p className="flex-1 text-sm text-slate-700 break-words">{n.texto}</p>
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => empezarEdicion(n)} title="Editar" className="text-slate-400 hover:text-indigo-500 cursor-pointer">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => eliminar(n.id)} title="Eliminar" className="text-slate-400 hover:text-rose-500 cursor-pointer">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Agregar */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/40">
                <input
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") agregar() }}
                    placeholder="Nueva nota…"
                    className="flex-1 bg-white/70 border border-white/60 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/90"
                />
                <button onClick={agregar} disabled={busy || !nueva.trim()} className="px-3 py-2 text-sm rounded-lg font-semibold bg-sky-500 text-white hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    + Agregar
                </button>
            </div>

            {onClose && (
                <div className="flex justify-end pt-1">
                    <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium hover:bg-white active:scale-95 transition cursor-pointer">
                        Cerrar
                    </button>
                </div>
            )}
        </div>
    )
}
