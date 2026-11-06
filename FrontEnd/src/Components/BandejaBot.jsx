"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { botNuevos, botValidar } from "@/Services/tencicosServices"

// Plan del bot, fases 3 y 5 · lo que llega por WhatsApp, dentro del panel del técnico:
//  - «Llegaron N trabajos nuevos por WhatsApp · Ver»: se pregunta cada 20 s SOLO con la pestaña visible, y nunca
//    mueve la tabla sola (se recarga al pulsar Ver, y no con cambios sin guardar).
//  - «N por validar (M con alertas) · Aprobar todos», con la lista de alertas para revisar antes.
//  - En la tabla, cada fila del bot lleva una marca a la izquierda (marcaBot).

const CADA_MS = 20000

const alertasDe = (r) => {
    if (!r?.alertas) return []
    if (Array.isArray(r.alertas)) return r.alertas
    try { return JSON.parse(r.alertas) } catch { return [] }
}

export function marcaBot(r) {
    if (r?.validacion !== "por_validar") return null
    const al = alertasDe(r)
    return al.length
        ? { clase: "shadow-[inset_3px_0_0_#f59e0b]", titulo: `Llegó por WhatsApp · por validar\n${al.map((a) => `• ${a.texto}`).join("\n")}` }
        : { clase: "shadow-[inset_3px_0_0_#38bdf8]", titulo: "Llegó por WhatsApp · por validar" }
}

export function BandejaBot({ nombre, semana, registros, hayPendientes, recargar, onAviso }) {
    const [nuevos, setNuevos] = useState(0)
    const [abierta, setAbierta] = useState(false)
    const [aprobando, setAprobando] = useState(false)

    const porValidar = useMemo(() => registros.filter((r) => r.validacion === "por_validar" && r.id_registro), [registros])
    const conAlertas = useMemo(() => porValidar.filter((r) => alertasDe(r).length), [porValidar])
    const ultimoId = useMemo(() => registros.reduce((m, r) => Math.max(m, Number(r.id_registro) || 0), 0), [registros])

    const ultimoRef = useRef(ultimoId)
    useEffect(() => { ultimoRef.current = ultimoId }, [ultimoId])

    useEffect(() => {
        if (!nombre || !semana) return
        let vivo = true
        const pregunta = async () => {
            if (document.visibilityState !== "visible") return
            try {
                const r = await botNuevos(nombre, semana, ultimoRef.current)
                if (vivo) setNuevos(r?.nuevos ?? 0)
            } catch { /* sin red o sin sesión: se reintenta en la siguiente vuelta */ }
        }
        const t = setInterval(pregunta, CADA_MS)
        document.addEventListener("visibilitychange", pregunta)
        return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", pregunta) }
    }, [nombre, semana])

    const ver = () => { setNuevos(0); recargar() }

    const aprobarTodos = async () => {
        setAprobando(true)
        try {
            const r = await botValidar(porValidar.map((x) => x.id_registro))
            onAviso?.(`${r?.validados ?? 0} trabajos aprobados.`)
            recargar()
        } catch {
            onAviso?.("No se pudieron aprobar. Intenta de nuevo.")
        } finally {
            setAprobando(false)
        }
    }

    if (!nuevos && !porValidar.length) return null
    const bloqueo = hayPendientes ? "Guarda tus cambios primero" : null

    return (
        <div className="mx-auto mb-3 w-full max-w-[1400px] rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {nuevos > 0 && (
                    <span className="flex items-center gap-2">
                        <span>Llegaron <b>{nuevos}</b> {nuevos === 1 ? "trabajo nuevo" : "trabajos nuevos"} por WhatsApp</span>
                        <button type="button" onClick={ver} disabled={!!bloqueo} title={bloqueo ?? undefined}
                            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50">
                            Ver
                        </button>
                    </span>
                )}
                {porValidar.length > 0 && (
                    <span className="flex flex-wrap items-center gap-2">
                        <span>
                            <b>{porValidar.length}</b> por validar
                            {conAlertas.length > 0 && <> · <b className="text-amber-700">{conAlertas.length} con alertas</b></>}
                        </span>
                        {conAlertas.length > 0 && (
                            <button type="button" onClick={() => setAbierta((v) => !v)}
                                className="text-xs font-medium underline underline-offset-2">
                                {abierta ? "Ocultar alertas" : "Ver alertas"}
                            </button>
                        )}
                        <button type="button" onClick={aprobarTodos} disabled={aprobando || !!bloqueo} title={bloqueo ?? undefined}
                            className="rounded-full border border-sky-600 px-3 py-1 text-xs font-medium text-sky-700 disabled:opacity-50">
                            {aprobando ? "Aprobando…" : "Aprobar todos"}
                        </button>
                    </span>
                )}
                {bloqueo && <span className="text-xs text-slate-500">{bloqueo}</span>}
            </div>
            {abierta && conAlertas.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-sky-200 pt-2 text-xs">
                    {conAlertas.map((r) => (
                        <li key={r.id_registro}>
                            <b>{r.job_name || "Sin job"}</b>: {alertasDe(r).map((a) => a.texto).join(" · ")}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
