"use client"

import { DialogTitle } from "@headlessui/react"
import { useState } from "react"
import { parsearMensaje } from "../../../Services/tencicosServices.js"

export function ModalAutoMessage({
    title,
    setIsOpen,
    setError,
    setLoading,
    procesarMensaje,
    setModalTipo,
    setResultadoParcial,
    setCamposFaltantes
}) {

    const [mensaje, setMensaje] = useState("")

    function insertarFormato() {
        const formato = `Company: American Services
Job: XXXXX

Name: Customer Name
Phone1: +1XXXXXXXXXX

Job Type: Car Lock-out

Address: Street Address
City, State ZIP

Cash: 120
Parts: 0
Parts gil: 0

Notes:
`
        setMensaje(formato)
    }

    async function confirmar() {
        setIsOpen(false)
        if (!mensaje.trim()) {
            setError("Debe ingresar un mensaje")
            return
        }
        try {
            setLoading(true)
            const result = await parsearMensaje(mensaje)
            console.log(result)
            if (result.faltantes && result.faltantes.length > 0) {
                setResultadoParcial(result)
                setCamposFaltantes(result.faltantes)
                setModalTipo("CAMPOS_FALTANTES")
                setIsOpen(true)
            } else {
                procesarMensaje(result)
            }
        } catch (err) {
            console.error(err)
            setError("Error procesando mensaje")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <DialogTitle className="text-base font-semibold text-slate-800 mb-4">
                {title}
            </DialogTitle>

            <div className="flex justify-end mb-3">
                <button
                    onClick={insertarFormato}
                    className="cursor-pointer px-3 py-1 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-indigo-600 font-medium shadow-md hover:bg-white active:scale-95 transition-all"
                >
                    FORMATO RECOMENDADO
                </button>
            </div>

            <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Pegue o escriba el mensaje aquí..."
                className="w-full h-[220px] resize-none px-4 py-3 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 text-sm text-slate-700 placeholder-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            />

            <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white active:scale-95 transition-all"
                >
                    Cancelar
                </button>
                <button
                    onClick={confirmar}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-green-600 font-medium shadow-md hover:bg-white active:scale-95 transition-all"
                >
                    Confirmar
                </button>
            </div>
        </>
    )
}