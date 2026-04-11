export function TablaAcciones({ handlers, modal, haycambiosPendientes, guardando }) {

    const { handleBtnAgregar, clickExportExcel, guardarCambios } = handlers
    const { openModal } = modal

    return (
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">

            <div className="flex flex-wrap items-center gap-2">
                <button
                    className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 text-amber-600 font-semibold shadow-sm hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={() => openModal("NOTAS")}
                >
                    📝 Notas
                </button>

                <button
                    className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 text-green-600 font-semibold shadow-sm hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={clickExportExcel}
                >
                    Exportar Excel
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">

                {haycambiosPendientes && (
                    <button
                        onClick={guardarCambios}
                        disabled={guardando}
                        style={{ backgroundColor: guardando ? "#86efac" : "#22c55e", color: "white" }}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                        {guardando ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Guardar cambios
                            </>
                        )}
                    </button>
                )}

                <button
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-indigo-500/90 backdrop-blur-xl text-white font-semibold shadow-md shadow-indigo-200/50 hover:bg-indigo-500 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={() => openModal("AUTO_MESSAGE")}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Mensaje
                </button>

                <button
                    onClick={handleBtnAgregar}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl font-semibold bg-white/60 backdrop-blur-xl border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar
                </button>

            </div>

        </div>
    )
}