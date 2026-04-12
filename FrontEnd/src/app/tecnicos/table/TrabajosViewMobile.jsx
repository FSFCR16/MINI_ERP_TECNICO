"use client"
import { useState } from "react"
import { CellRenderer } from '../../tecnico/[nombre]/[semana]/tableRow/renderCell.jsx'
import { BuscadorRegistros } from "../../tecnico/[nombre]/[semana]/components/BuscadorRegistros.jsx"
import Link from "next/link"

export function TrabajosViewMobile({ state, handlers, nav }) {
    const {
        trabajos,
        rowData,
        elementosAEliminar,
        columnasTablaGeneral,
        columnasTablaEditable,
        activeHeader,
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
        revertirCambios,
        setActiveHeader,
    } = handlers

    const { moverseEntreCeldas, baseRef } = nav

    const [expandido, setExpandido] = useState(null)
    const [editando, setEditando] = useState(null)
    const [registrosFiltrados, setRegistrosFiltrados] = useState(null)

    const listaVisible = registrosFiltrados ?? trabajos

    const toggleExpandido = (index) => {
        setExpandido(prev => prev === index ? null : index)
        if (expandido === index) setEditando(null)
    }

    const toggleEditar = (e, index) => {
        e.stopPropagation()
        setEditando(prev => prev === index ? null : index)
        setExpandido(index)
    }

    const tieneError = () => false

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 p-4 flex flex-col gap-4" style={{ paddingBottom: "160px" }}>

            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-sm px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Técnicos</span>
                    {trabajos.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-600 border border-indigo-200/60">
                            {trabajos.length}
                        </span>
                    )}
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/50 border border-white/50 text-slate-500 font-medium active:scale-95 transition"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Inicio
                </Link>
            </div>

            {/* FORMULARIO NUEVO TÉCNICO */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-white/40 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800 text-sm">Nuevo técnico</h2>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                    {columnasTablaEditable.map((col, index) => (
                        <div key={col.key} className={`flex flex-col gap-1 ${col.fullWidth ? "col-span-2" : ""}`}>
                            <label className="text-[11px] text-slate-500 font-medium pl-1">{col.label}</label>
                            <div className="bg-white/50 border border-white/60 rounded-xl overflow-hidden">
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
                                    isMobile={true}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-4 pb-4">
                    <button
                        onClick={handleBtnAgregar}
                        className="w-full py-2.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 text-sky-600 text-sm font-semibold shadow-sm active:scale-[0.98] transition-all duration-150"
                    >
                        + Agregar técnico
                    </button>
                </div>
            </div>

            {/* HEADER LISTA + BUSCADOR */}
            {trabajos.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-600">
                                {listaVisible.length}{listaVisible.length !== trabajos.length ? `/${trabajos.length}` : ""} técnico{trabajos.length !== 1 ? "s" : ""}
                            </p>
                            <button
                                onClick={toggleSeleccionTodos}
                                className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/60 border border-white/50 active:scale-95 transition"
                            >
                                {elementosAEliminar.length === trabajos.length ? "Deseleccionar" : "Todos"}
                            </button>
                        </div>
                        {elementosAEliminar.length > 0 && (
                            <button
                                onClick={eliminarSeleccionados}
                                className="text-xs text-rose-500 font-medium px-3 py-1 rounded-full bg-rose-50/80 border border-rose-100 active:scale-95 transition"
                            >
                                Eliminar {elementosAEliminar.length}
                            </button>
                        )}
                    </div>

                    <BuscadorRegistros
                        registros={trabajos}
                        onFiltrar={setRegistrosFiltrados}
                    />
                </div>
            )}

            {/* CARDS */}
            <div className="flex flex-col gap-3">
                {listaVisible.length === 0 && trabajos.length > 0 && (
                    <p className="text-center text-xs text-slate-400 py-6">Sin resultados</p>
                )}

                {listaVisible.map((row, index) => {
                    const indexReal = trabajos.indexOf(row)
                    const abierto = expandido === index
                    const modoEdicion = editando === index
                    const seleccionado = elementosAEliminar.includes(row)

                    return (
                        <div
                            key={index}
                            className={`bg-white/60 backdrop-blur-2xl border rounded-3xl shadow-md overflow-hidden transition-all duration-300 ${
                                seleccionado ? "border-indigo-300/60 bg-indigo-50/40" :
                                modoEdicion  ? "border-sky-300/60 bg-sky-50/20" :
                                "border-white/50"
                            }`}
                        >
                            {/* CABECERA */}
                            <div
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-white/40 transition"
                                onClick={() => toggleExpandido(index)}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={seleccionado}
                                        onChange={() => toggleSeleccion(row)}
                                        className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
                                    />
                                </div>

                                <span className="text-[11px] font-bold text-slate-400 min-w-[20px]">#{index + 1}</span>

                                <div className="flex-1 flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-slate-700 truncate">
                                        {row.nombre ?? row.job ?? "—"}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate">
                                        {row.job ?? "—"}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => toggleEditar(e, index)}
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition active:scale-95 ${
                                            modoEdicion
                                                ? "bg-sky-500 text-white border-sky-400"
                                                : "bg-white/60 text-sky-600 border-white/50"
                                        }`}
                                    >
                                        {modoEdicion ? "✓ Listo" : "Editar"}
                                    </button>

                                    <svg
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${abierto ? "rotate-180" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* CONTENIDO */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${abierto ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}>
                                <div className="border-t border-white/40 mx-4" />

                                {modoEdicion ? (
                                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                                        {columnasTablaGeneral
                                            .filter(col => col.key !== "check_box")
                                            .map(col => (
                                                <div key={col.key} className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide pl-1">
                                                        {col.label}
                                                    </label>
                                                    {col.editable ? (
                                                        <div className="bg-white/70 border border-sky-200/60 rounded-xl overflow-hidden shadow-sm">
                                                            <CellRenderer
                                                                col={col}
                                                                index={0}
                                                                rowData={row}
                                                                setRow={(valOrFn) => {
                                                                    const next = typeof valOrFn === "function" ? valOrFn(row) : valOrFn
                                                                    Object.keys(next).forEach(k => {
                                                                        if (next[k] !== row[k]) {
                                                                            actualizarCeldaTrabajo(indexReal, k, next[k])
                                                                        }
                                                                    })
                                                                }}
                                                                data={[]}
                                                                tieneError={() => false}
                                                                setCellRef={() => {}}
                                                                moverseEntreCeldas={() => {}}
                                                                columnasDeshabilitdasGenerales={[]}
                                                                setNotas={() => {}}
                                                                isMobile={true}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-500 px-1">
                                                            {row[col.key] ?? "—"}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                                        {columnasTablaGeneral
                                            .filter(col => col.key !== "check_box")
                                            .map(col => (
                                                <div key={col.key} className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                                        {col.label}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-700 break-words">
                                                        {row[col.key] ?? "—"}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* BARRA INFERIOR */}
            <div className="fixed bottom-0 left-0 w-full bg-white/70 backdrop-blur-2xl border-t border-white/50 px-4 py-3 flex gap-2 z-40">
                {haycambiosPendientes && (
                    <>
                        <button
                            onClick={() => revertirCambios(false)}
                            disabled={guardando}
                            className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-rose-500 font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
                        >
                            Revertir
                        </button>
                        <button
                            onClick={guardarCambios}
                            disabled={guardando}
                            className="flex-1 py-2 text-xs rounded-2xl font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
                            style={{ backgroundColor: guardando ? "#86efac" : "#22c55e", color: "white" }}
                        >
                            {guardando ? "Guardando..." : "Guardar"}
                        </button>
                    </>
                )}
            </div>

        </div>
    )
}