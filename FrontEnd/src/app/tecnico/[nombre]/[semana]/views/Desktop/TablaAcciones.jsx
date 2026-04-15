import { memo, useRef, useEffect, useCallback } from "react"

export const TablaAcciones = memo(function TablaAcciones({ handlers, modal, haycambiosPendientes, guardando }) {

    const { handleBtnAgregar, clickExportExcel, guardarCambios, revertirCambios } = handlers
    const { openModal } = modal

    const propFunctionsRef = useRef({
        handleBtnAgregar,
        clickExportExcel,
        guardarCambios,
        revertirCambios,
        openModal,
    })

    useEffect(() => {
        propFunctionsRef.current = {
            handleBtnAgregar,
            clickExportExcel,
            guardarCambios,
            revertirCambios,
            openModal,
        }
    })

    const stableAgregar       = useCallback(() => propFunctionsRef.current.handleBtnAgregar(),   [])
    const stableExcel         = useCallback(() => propFunctionsRef.current.clickExportExcel(),   [])
    const stableGuardar       = useCallback(() => propFunctionsRef.current.guardarCambios(),     [])
    const stableRevertir      = useCallback((v) => propFunctionsRef.current.revertirCambios(v), [])
    const stableOpenModal     = useCallback((v) => propFunctionsRef.current.openModal(v),        [])

    return (
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">

            <div className="flex flex-wrap items-center gap-2">
                <button
                    className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 text-amber-600 font-semibold shadow-sm hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={() => stableOpenModal("NOTAS")}
                >
                    📝 Notas
                </button>

                <button
                    className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl bg-white/60 backdrop-blur-xl border border-white/50 text-green-600 font-semibold shadow-sm hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={stableExcel}
                >
                    Exportar Excel
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">

                {haycambiosPendientes && (
                    <>
                        <button
                            onClick={() => stableRevertir(false)}
                            disabled={guardando}
                            style={{ opacity: guardando ? 0.4 : 1, cursor: guardando ? "not-allowed" : "pointer" }}
                            className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl font-semibold bg-white/60 backdrop-blur-xl border border-white/50 text-rose-500 shadow-sm hover:bg-white/80 active:scale-95 transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Revertir
                        </button>

                        <button
                            onClick={stableGuardar}
                            disabled={guardando}
                            style={{ backgroundColor: guardando ? "#86efac" : "#22c55e", color: "white" }}
                            className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
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
                    </>
                )}

                <button
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-indigo-500/90 backdrop-blur-xl text-white font-semibold shadow-md shadow-indigo-200/50 hover:bg-indigo-500 active:scale-95 transition-all duration-200 cursor-pointer"
                    onClick={() => stableOpenModal("AUTO_MESSAGE")}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Mensaje
                </button>

                <button
                    onClick={stableAgregar}
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
})