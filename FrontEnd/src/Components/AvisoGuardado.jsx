"use client"
import { useEffect } from "react"

// Plan del bot, fase 2 · lo que pasa al guardar, sin tapar la tabla:
//   ajuste → el servidor puso otro total (se va solo)
//   error  → quedó sin guardar; los cambios siguen en la tabla y se reintenta con Guardar / Ctrl+S
export function AvisoGuardado({ aviso, cerrar }) {
    useEffect(() => {
        if (aviso?.tipo !== "ajuste") return
        const t = setTimeout(cerrar, 6000)
        return () => clearTimeout(t)
    }, [aviso, cerrar])

    if (!aviso) return null
    const error = aviso.tipo === "error"
    return (
        <div role={error ? "alert" : "status"}
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] w-max flex items-start gap-3
                px-4 py-3 rounded-2xl shadow-lg border text-sm ${error
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            <span className="leading-snug">{aviso.texto}</span>
            <button type="button" onClick={cerrar} aria-label="Cerrar aviso"
                className="shrink-0 text-xs font-medium underline underline-offset-2 opacity-70 hover:opacity-100">
                Cerrar
            </button>
        </div>
    )
}
