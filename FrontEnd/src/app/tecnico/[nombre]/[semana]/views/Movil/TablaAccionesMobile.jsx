"use client";

export function TablaAccionesMobile({ handlers, modal }) {

    const { handleBtnAgregar, clickExportExcel } = handlers
    const { openModal } = modal

    return (
        <div className="fixed bottom-0 left-0 w-full z-40 px-4 pb-4 pt-2">
            
            <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-xl p-3 flex flex-col gap-2">

                {/* FILA PRINCIPAL */}
                <div className="flex gap-2">
                    <button
                        onClick={() => openModal("FINALIZAR")}
                        className="flex-1 py-2.5 rounded-2xl bg-white/60 border border-white/50 text-sky-600 text-sm font-semibold shadow-sm active:scale-95 transition"
                    >
                        Finalizar
                    </button>

                    <button
                        onClick={handleBtnAgregar}
                        className="flex-1 py-2.5 rounded-2xl bg-indigo-500/90 text-white text-sm font-semibold shadow-md shadow-indigo-200/50 active:scale-95 transition"
                    >
                        + Agregar
                    </button>
                </div>

                {/* FILA SECUNDARIA */}
                <div className="flex gap-2">
                    <button
                        onClick={clickExportExcel}
                        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-green-600 font-medium shadow-sm active:scale-95 transition"
                    >
                        Exportar
                    </button>

                    <button
                        onClick={() => openModal("NOTAS")}
                        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-amber-600 font-medium shadow-sm active:scale-95 transition"
                    >
                        Notas
                    </button>

                    <button
                        onClick={() => openModal("AUTO_MESSAGE")}
                        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-indigo-600 font-medium shadow-sm active:scale-95 transition"
                    >
                        Mensaje
                    </button>
                </div>

            </div>
        </div>
    )
}