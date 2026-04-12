"use client"
import { useState } from "react"
import { TablaTrabajos } from "./table/TablaTrabajos"
import { CellRenderer } from '../tecnico/[nombre]/[semana]/tableRow/renderCell.jsx'
import { BuscadorRegistros } from '../tecnico/[nombre]/[semana]/components/BuscadorRegistros.jsx'
import Link from "next/link"

export function TrabajosView({ state, handlers, nav }) {

    const {
        trabajos,
        rowData,
        elementosAEliminar,
        columnasTablaGeneral,
        columnasTablaEditable,
        activeCell,
        activeHeader,
        celdaEditando,
        guardando,
        haycambiosPendientes,
    } = state

    const {
        setRow,
        toggleSeleccion,
        toggleSeleccionTodos,
        eliminarSeleccionados,
        handleBtnAgregar,
        actualizarCeldaTrabajo,
        guardarCambios,
        setActiveCell,
        setActiveHeader,
        setCeldaEditando,
        revertirCambios,
    } = handlers

    const {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEntreCeldas,
        moverseEnTablaGeneral,
        baseRef,
    } = nav

    const [registrosFiltrados, setRegistrosFiltrados] = useState(null)
    const listaVisible = registrosFiltrados ?? trabajos

    const tieneError = () => false

    return (
        <div className="h-screen w-full flex justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">
            <div className="w-full max-w-[1250px] flex flex-col gap-4 h-full">

                {/* HEADER */}
                <div className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">
                            Técnicos
                        </span>
                        {trabajos.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-600 border border-indigo-200/60">
                                {trabajos.length}
                            </span>
                        )}
                    </div>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Inicio
                    </Link>
                </div>
                {/* TABLA GENERAL */}
                <TablaTrabajos
                    state={{
                        trabajos: listaVisible,
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
                        actualizarCeldaTrabajo,
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

                {/* TABLA EDITABLE */}
                <section className="w-full flex flex-col gap-2">
                    <div className="px-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Nuevo técnico
                        </span>
                    </div>

                    <div className="w-full overflow-auto custom-scroll rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg">
                        <table className="min-w-[900px] w-full border-collapse table-fixed text-sm">
                            <thead className="bg-white/60 backdrop-blur-md text-slate-700">
                                <tr>
                                    {columnasTablaEditable.map((col, i) => {
                                        const headerKey = `headerEditable-${i}`
                                        return (
                                            <th
                                                key={col.key}
                                                onClick={() => setActiveHeader(activeHeader === headerKey ? null : headerKey)}
                                                className="px-2 py-1 text-[11px] font-semibold border-b border-white/40 text-center cursor-pointer hover:bg-white/40 transition"
                                            >
                                                <div className="w-full overflow-hidden whitespace-nowrap">
                                                    <span className={`block w-full ${activeHeader === headerKey ? "animate-scrollText" : "truncate"}`}>
                                                        {col.label}
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {columnasTablaEditable.map((col, index) => (
                                        <td key={col.key} className="px-2 py-1">
                                            <CellRenderer
                                                col={col}
                                                index={index}
                                                rowData={rowData}
                                                setRow={setRow}
                                                data={[]}
                                                tieneError={tieneError}
                                                setCellRef={baseRef}
                                                moverseEntreCeldas={moverseEntreCeldas}
                                                columnasDeshabilitdasGenerales={[]}
                                                setNotas={() => {}}
                                                isMobile={false}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* BOTONES */}
                    <div className="w-full flex justify-end gap-2 pt-1">

                        {haycambiosPendientes && (
                            <>
                                <button
                                    onClick={() => revertirCambios(false)}
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
                                    onClick={guardarCambios}
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
                            className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-xl font-semibold bg-white/60 backdrop-blur-xl border border-white/50 text-sky-600 hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                            onClick={handleBtnAgregar}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar técnico
                        </button>

                    </div>
                </section>

            </div>
        </div>
    )
}