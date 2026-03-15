import { DialogTitle } from "@headlessui/react"
import { useState } from "react"

export function ModalCamposFaltantes({
    title,
    faltantes,
    resultadoParcial,
    setIsOpen,
    procesarMensaje
    }) {

    const [valores, setValores] = useState({})

    function handleChange(campo, valor) {
        setValores(prev => ({ ...prev, [campo]: valor }))
    }

    function confirmar() {
        const todosLlenos = faltantes.every(f => valores[f])
        if (!todosLlenos) return

        const resultadoCompleto = { ...resultadoParcial, ...valores }
        procesarMensaje(resultadoCompleto)
        setIsOpen(false)
    }

    return (
        <>
            <DialogTitle className="text-base font-semibold text-slate-800 mb-4">
                {title}
            </DialogTitle>

            <div className="flex flex-col gap-4">
                {faltantes.includes("job_type") && (
                    <div>
                        <label className="text-sm text-slate-700 font-medium">Tipo de trabajo</label>
                        <select
                            onChange={e => handleChange("job_type", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-white/40 bg-white/50 backdrop-blur-xl px-3 py-1.5 text-sm text-slate-800 shadow-md"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="CAR KEY">CAR KEY</option>
                            <option value="LOCKOUT">LOCKOUT</option>
                        </select>
                    </div>
                )}

                {faltantes.includes("tipo_pago") && (
                    <div>
                        <label className="text-sm text-slate-700 font-medium">Tipo de pago</label>
                        <select
                            onChange={e => handleChange("tipo_pago", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-white/40 bg-white/50 backdrop-blur-xl px-3 py-1.5 text-sm text-slate-800 shadow-md"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="CASH">CASH</option>
                            <option value="CC">CC</option>
                            <option value="MIXTO">MIXTO</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                >
                    CANCELAR
                </button>
                <button
                    onClick={confirmar}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-sky-600 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                >
                    CONFIRMAR
                </button>
            </div>
        </>
    )
}