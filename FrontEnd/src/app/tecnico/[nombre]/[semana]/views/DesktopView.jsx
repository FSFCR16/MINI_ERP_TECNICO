import { TablaRegistros } from './Desktop/TablaRegistros.jsx'
import { TablaEditable } from './Desktop/TablaEditable.jsx'
import { TablaAcciones } from './Desktop/TablaAcciones.jsx'
import Link from "next/link"

export function DesktopView({ state, handlers, nav, modal }) {

    // 🔹 STATE
    const {
        nombre,
        semanaFechas,
        listRegistro,
        rowData,
        data,
        elementosAEliminar,
        columnasDeshabilitdasGenerales,
        columnasTablaGeneral,
        columnasTablaEditable,
        activeCell,
        activeHeader,
        celdaEditando,
        tieneError,
        guardando,
        haycambiosPendientes,   // ✅ nuevo
    } = state

    // 🔹 HANDLERS
    const {
        handleBtnAgregar,
        eliminarSeleccionados,
        clickExportExcel,
        actualizarCeldaRegistro,
        toggleSeleccion,
        toggleSeleccionTodos,
        setRow,
        setNotas,
        guardarCambios,
        revertirCambios,      // ✅ nuevo
    } = handlers

    // 🔹 NAV
    const {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEntreCeldas,
        moverseEnTablaGeneral,
        baseRef,
        setActiveCell,
        setActiveHeader,
        setCeldaEditando,
    } = nav

    // 🔹 MODAL
    const { openModal } = modal

    return (
        <div className="h-screen w-full flex justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">
            <div className="w-full max-w-[1250px] flex flex-col gap-4 h-full">

                {/* HEADER */}
                <div className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">Técnico</span>
                        <span className="text-sm text-slate-800">{nombre}</span>
                        <span className="text-slate-300 select-none">·</span>
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">Semana</span>
                        <span className="text-sm text-slate-600">
                            {semanaFechas.inicio} / {semanaFechas.fin} {new Date().getFullYear()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200 cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Inicio
                        </Link>

                        <button
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-amber-600 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200 cursor-pointer"
                            onClick={() => openModal("HISTORIAL")}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Historial
                        </button>
                    </div>
                </div>

                {/* TABLA REGISTROS */}
                <TablaRegistros
                    state={{
                        listRegistro,
                        elementosAEliminar,
                        columnasTablaGeneral,
                        activeCell,
                        activeHeader,
                        celdaEditando,
                        guardando,
                    }}
                    handlers={{
                        eliminarSeleccionados,
                        toggleSeleccion,
                        toggleSeleccionTodos,
                        actualizarCeldaRegistro,
                        setActiveCell,
                        setActiveHeader,
                        setCeldaEditando,
                    }}
                    nav={{
                        celdasTablaRef,
                        checkboxMaestroRef,
                        guardandoRef,
                        moverseEnTablaGeneral,
                    }}
                />

                {/* TABLA EDITABLE + ACCIONES */}
                <section className="w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Nuevo registro
                        </span>
                    </div>

                    <TablaEditable
                        state={{
                            columnasTablaEditable,
                            columnasDeshabilitdasGenerales,
                            rowData,
                            data,
                            tieneError,
                            activeHeader,
                        }}
                        handlers={{
                            setRow,
                            setNotas,
                            setActiveHeader,
                        }}
                        nav={{
                            moverseEntreCeldas,
                            baseRef,
                        }}
                    />

                    <TablaAcciones
                        handlers={{ handleBtnAgregar, clickExportExcel, guardarCambios, revertirCambios }}
                        modal={{ openModal }}
                        haycambiosPendientes={haycambiosPendientes}
                        guardando={guardando}
                    />
                </section>

            </div>
        </div>
    )
}