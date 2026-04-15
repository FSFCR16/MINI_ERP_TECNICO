import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { formatearNumero } from '../../../../../../Utils/api.js'
import { BuscadorRegistros } from '../../components/BuscadorRegistros.jsx'
import { useSeleccionStore } from '../../../../../../app/stores/useClipboardStore.js'

// 1. React.memo envolviendo el componente para evitar renders innecesarios
const FilaRegistro = memo(function FilaRegistro({
    row,
    indexrow,
    columnasTablaGeneral,
    marcadoParaEliminar, // <- Ahora es un booleano, no el array completo
    estaGuardando,       // <- Ahora es un booleano, no el objeto completo
    activeCell,
    actualizarCeldaRegistro,
    toggleSeleccion,
    setActiveCell,
    moverseEnTablaGeneral,
    celdasTablaRef,
    guardandoRef,
    iniciarDrag,
    extenderDrag,
    handleContextMenu,
}) {
    // console.log(`FilaRegistro render fila ${indexrow}`) // Puedes descomentar para probar

    // 2. Zustand al rescate: La fila lee su propia selección
    const esSeleccionada = useSeleccionStore(
        useCallback(s => s.seleccion.has(row.id_registro), [row.id_registro])
    )

    // 3. Estado LOCAL para la edición: Ya no depende de TablaRegistros
    const [columnaEditando, setColumnaEditando] = useState(null)

    return (
        <tr
            // Eventos del ratón para el Drag & Select
            onMouseDown={(e) => {
                if (e.target.type === 'checkbox') return
                iniciarDrag(row.id_registro)
            }}
            onMouseEnter={() => extenderDrag(row.id_registro)}
            onContextMenu={handleContextMenu}
            className={`
                transition duration-200 hover:bg-white/40 select-none
                ${esSeleccionada
                    ? "bg-amber-100/70 ring-1 ring-inset ring-amber-300/60"
                    : marcadoParaEliminar
                        ? "bg-blue-50/60"
                        : ""
                }
            `}
        >
            {columnasTablaGeneral.map((col, indexCol) => {
                const cellKey = `${indexrow}-${indexCol}`
                const value = row[col.key]
                const isTotal = col.key === "total"
                const esEditable = col.editable !== false
                const component = typeof col.component === "function"
                    ? col.component({ rowData: row })
                    : col.component ?? col.tipo

                return (
                    <td
                        key={indexCol}
                        className={`px-1 py-1 border-b border-white/30 ${indexCol === 0 ? "text-center w-[32px]" : "text-center"}`}
                    >
                        {indexCol === 0 ? (
                            <input
                                type="checkbox"
                                checked={marcadoParaEliminar}
                                onChange={() => toggleSeleccion(row)}
                                className="w-3.5 h-3.5 cursor-pointer"
                            />
                        ) : component === "checkbox" ? (
                            <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) => actualizarCeldaRegistro(row.id_registro, col.key, e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-indigo-500"
                            />
                        ) : columnaEditando === indexCol ? (
                            <input
                                autoFocus
                                type={Number.isFinite(value) ? "number" : "text"}
                                defaultValue={value}
                                className="w-full text-[12px] bg-white/80 border border-indigo-300/60 rounded px-1 outline-none"
                                onBlur={(e) => {
                                    if (guardandoRef.current) { guardandoRef.current = false; return }
                                    const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                    actualizarCeldaRegistro(row.id_registro, col.key, val)
                                    setColumnaEditando(null)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        guardandoRef.current = true
                                        e.target.blur()
                                        setColumnaEditando(null)
                                        return
                                    }
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        guardandoRef.current = true
                                        const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                        actualizarCeldaRegistro(row.id_registro, col.key, val)
                                        setColumnaEditando(null)
                                        setTimeout(() => {
                                            celdasTablaRef.current[`${indexrow + 1}-${indexCol}`]?.focus()
                                        }, 0)
                                        return
                                    }
                                    if (e.key === "Tab") {
                                        e.preventDefault()
                                        guardandoRef.current = true
                                        const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                        actualizarCeldaRegistro(row.id_registro, col.key, val)
                                        setColumnaEditando(null)
                                        setTimeout(() => {
                                            celdasTablaRef.current[`${indexrow}-${indexCol + 1}`]?.focus()
                                        }, 0)
                                        return
                                    }
                                }}
                                ref={el => { celdasTablaRef.current[cellKey] = el }}
                            />
                        ) : (
                            <div
                                tabIndex={0}
                                onDoubleClick={() => { if (esEditable) setColumnaEditando(indexCol) }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        if (esEditable) { setColumnaEditando(indexCol); return }
                                    }
                                    moverseEnTablaGeneral(e, indexrow, indexCol)
                                }}
                                ref={el => { celdasTablaRef.current[cellKey] = el }}
                                onClick={() => setActiveCell(activeCell === cellKey ? null : cellKey)}
                                className={`flex justify-start overflow-hidden whitespace-nowrap text-ellipsis text-[12px] ${
                                    esEditable ? "cursor-pointer" : "cursor-default"
                                } ${
                                    isTotal
                                        ? Number(value) < 0
                                            ? "text-rose-500 bg-rose-50 px-1 rounded"
                                            : "text-green-600 bg-green-50 px-1 rounded"
                                        : "text-slate-700"
                                }`}
                            >
                                <div className="flex items-center gap-1">
                                    <span className={`inline-block ${activeCell === cellKey ? "animate-scrollText" : "truncate"}`}>
                                        {Number.isFinite(value) ? formatearNumero(value) : value}
                                    </span>
                                    {estaGuardando && (
                                        <span className="text-[9px] text-blue-500 animate-pulse">...</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </td>
                )
            })}
        </tr>
    )
})

export function TablaRegistros({ state, handlers, nav }) {

    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const {
        listRegistro,
        elementosAEliminar,
        columnasTablaGeneral,
        activeCell,
        activeHeader,
        guardando,
        hayClipboard,
        clipboardRegistros,
        // celdaEditando <- ELIMINADO de aquí, ya no lo necesita el padre
    } = state

    const {
        eliminarSeleccionados,
        toggleSeleccion,
        toggleSeleccionTodos,
        actualizarCeldaRegistro,
        setActiveCell,
        setActiveHeader,
        // setCeldaEditando, <- ELIMINADO de aquí
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        scrollRef,
    } = handlers

    const {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEnTablaGeneral,
    } = nav

    const haySeleccion = useSeleccionStore(s => s.seleccion.size > 0)
    const numSeleccionados = useSeleccionStore(s => s.seleccion.size)

    const [idsFiltrados, setIdsFiltrados] = useState(null)
    const [contextMenu, setContextMenu] = useState(null)
    const contextMenuRef = useRef(null)
    const [toastCopiado, setToastCopiado] = useState(false)
    const toastTimer = useRef(null)

    const listaVisible = useMemo(() => {
        return idsFiltrados
            ? listRegistro.filter(r => idsFiltrados.has(r.id_registro))
            : listRegistro
    }, [listRegistro, idsFiltrados])

    const idsEliminarSet = useMemo(() => {
        return new Set(elementosAEliminar.map(e => e.id_registro))
    }, [elementosAEliminar])

    useEffect(() => {
        if (!contextMenu) return
        const handler = (e) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                setContextMenu(null)
            }
        }
        window.addEventListener('mousedown', handler)
        return () => window.removeEventListener('mousedown', handler)
    }, [contextMenu])

    useEffect(() => {
        if (!contextMenu) return
        const handler = (e) => { if (e.key === 'Escape') setContextMenu(null) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [contextMenu])

    const handleContextMenu = useCallback((e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }, [])

    const mostrarToast = useCallback(() => {
        setToastCopiado(true)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToastCopiado(false), 2200)
    }, [])

    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

    // ── BLINDAJE DE REFERENCIAS ──────────────────────────────────────
    const propFunctionsRef = useRef({
        iniciarDrag,
        extenderDrag,
        actualizarCeldaRegistro,
        toggleSeleccion,
        moverseEnTablaGeneral
    })

    useEffect(() => {
        propFunctionsRef.current = {
            iniciarDrag,
            extenderDrag,
            actualizarCeldaRegistro,
            toggleSeleccion,
            moverseEnTablaGeneral
        }
    }, [
        iniciarDrag,
        extenderDrag,
        actualizarCeldaRegistro,
        toggleSeleccion,
        moverseEnTablaGeneral
    ])

    const stableIniciarDrag = useCallback((id, e) => propFunctionsRef.current.iniciarDrag(id, e), [])
    const stableExtenderDrag = useCallback((id, e) => propFunctionsRef.current.extenderDrag(id, e), [])
    const stableActualizarCelda = useCallback((id, key, val) => propFunctionsRef.current.actualizarCeldaRegistro(id, key, val), [])
    const stableToggleSeleccion = useCallback((row) => propFunctionsRef.current.toggleSeleccion(row), [])
    const stableMoverse = useCallback((e, r, c) => propFunctionsRef.current.moverseEnTablaGeneral(e, r, c), [])
    // ────────────────────────────────────────────────────────────────

    return (
        <section className="w-full flex-1 min-h-0 overflow-hidden rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border border-white/40 flex flex-col relative">

            {/* ── HEADER ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/40 gap-3">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Registros</span>
                    {listRegistro.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-600 border border-indigo-200/60">
                            {listaVisible.length}{listaVisible.length !== listRegistro.length ? `/${listRegistro.length}` : ""}
                        </span>
                    )}
                    {haySeleccion && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {numSeleccionados} seleccionado{numSeleccionados !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {listRegistro.length > 0 && (
                    <div className="flex-1 max-w-xs">
                        <BuscadorRegistros registros={listRegistro} onFiltrar={setIdsFiltrados} />
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    {hayClipboard && (
                        <button
                            onClick={pegar}
                            className="group flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-xl
                                       bg-indigo-500 text-white border border-indigo-400
                                       hover:bg-indigo-600 active:scale-95 transition-all duration-150 shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5V2H3.5A1.5 1.5 0 002 3.5v11A1.5 1.5 0 003.5 16h9a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0012.5 2H11v-.5A1.5 1.5 0 009.5 0h-3z"/>
                            </svg>
                            Pegar
                            <span className="bg-indigo-400/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                {clipboardRegistros.length}
                            </span>
                        </button>
                    )}

                    {elementosAEliminar.length > 0 && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-xl bg-rose-50/80 border border-rose-200/60 text-rose-500 font-medium hover:bg-rose-100/80 active:scale-95 transition-all duration-150 cursor-pointer"
                            onClick={eliminarSeleccionados}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Eliminar {elementosAEliminar.length}
                        </button>
                    )}
                </div>
            </div>

            {/* ── TABLA ─────────────────────────────────────────────── */}
            <div
                ref={scrollRef}
                className="w-full flex-1 overflow-auto custom-scroll"
                onContextMenu={handleContextMenu}
            >
                <table className="w-full border-collapse table-fixed">
                    <thead className="bg-white/60 backdrop-blur-md text-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-1 py-1 border-b border-white/40 text-center" style={{ width: "32px" }}>
                                <input
                                    ref={checkboxMaestroRef}
                                    type="checkbox"
                                    className="w-3.5 h-3.5 cursor-pointer"
                                    checked={listRegistro.length > 0 && elementosAEliminar.length === listRegistro.length}
                                    onChange={toggleSeleccionTodos}
                                />
                            </th>
                            {columnasTablaGeneral.map((col, i) => {
                                if (i === 0) return null
                                const headerKey = `header-${i}`
                                return (
                                    <th
                                        key={col.key}
                                        className="px-1 py-1 text-[10px] font-semibold border-b border-white/40 text-center cursor-pointer hover:bg-white/40 transition"
                                        style={{ width: "auto" }}
                                        onClick={() => setActiveHeader(activeHeader === headerKey ? null : headerKey)}
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
                        {listaVisible.map((row, indexrow) => {
                            const marcadoParaEliminar = idsEliminarSet.has(row.id_registro)
                            const estaGuardando = !!guardando?.[indexrow]

                            return (
                                <FilaRegistro
                                    key={row.id_registro ?? row.id ?? indexrow}
                                    row={row}
                                    indexrow={indexrow}
                                    columnasTablaGeneral={columnasTablaGeneral}
                                    marcadoParaEliminar={marcadoParaEliminar}
                                    estaGuardando={estaGuardando}
                                    activeCell={activeCell}
                                    celdasTablaRef={celdasTablaRef}
                                    guardandoRef={guardandoRef}
                                    handleContextMenu={handleContextMenu}
                                    actualizarCeldaRegistro={stableActualizarCelda}
                                    toggleSeleccion={stableToggleSeleccion}
                                    setActiveCell={setActiveCell}
                                    moverseEnTablaGeneral={stableMoverse}
                                    iniciarDrag={stableIniciarDrag}
                                    extenderDrag={stableExtenderDrag}
                                />
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── CONTEXT MENU — montado en document.body via portal ── */}
            {isClient && contextMenu && createPortal(
                <div
                    ref={contextMenuRef}
                    style={{
                        position: "fixed",
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 99999,
                    }}
                    className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden"
                >
                    <button
                        onClick={() => {
                            if (!haySeleccion) return
                            copiar()
                            setContextMenu(null)
                            mostrarToast()
                        }}
                        disabled={!haySeleccion}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-all duration-150
                            ${haySeleccion
                                ? "text-slate-700 hover:bg-indigo-50 cursor-pointer"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                    >
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 text-indigo-500">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5V2H3.5A1.5 1.5 0 002 3.5v11A1.5 1.5 0 003.5 16h9a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0012.5 2H11v-.5A1.5 1.5 0 009.5 0h-3z"/>
                            </svg>
                        </span>
                        <span className="font-medium flex-1 text-left">Copiar</span>
                        {haySeleccion && (
                            <>
                                <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                    {numSeleccionados}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono ml-1">Ctrl+C</span>
                            </>
                        )}
                    </button>

                    <div className="mx-3 my-1 border-t border-slate-100" />

                    <button
                        onClick={() => { if (!hayClipboard) return; pegar(); setContextMenu(null) }}
                        disabled={!hayClipboard}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] transition-all duration-150
                            ${hayClipboard
                                ? "text-slate-700 hover:bg-indigo-50 cursor-pointer"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                    >
                        <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[13px]
                            ${hayClipboard ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-300"}`}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5 1.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z"/>
                                <path d="M3.5 2A1.5 1.5 0 002 3.5v11A1.5 1.5 0 003.5 16h9a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0012.5 2H12a.5.5 0 000 1h.5a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5H4a.5.5 0 000-1h-.5z"/>
                                <path d="M8 7.5a.5.5 0 01.5.5v2h2a.5.5 0 010 1h-2v2a.5.5 0 01-1 0v-2h-2a.5.5 0 010-1h2v-2a.5.5 0 01.5-.5z"/>
                            </svg>
                        </span>
                        <span className="font-medium flex-1 text-left">Pegar</span>
                        {hayClipboard && (
                            <>
                                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">
                                    {clipboardRegistros.length}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono ml-1">Ctrl+V</span>
                            </>
                        )}
                    </button>
                </div>,
                document.body
            )}

            {isClient && createPortal(
                <div
                    style={{ zIndex: 999999 }}
                    className={`
                        fixed bottom-8 left-1/2 -translate-x-1/2
                        flex items-center gap-2.5
                        bg-slate-800 text-white
                        px-4 py-2.5 rounded-2xl shadow-2xl
                        text-[12px] font-semibold
                        transition-all duration-300 ease-out
                        ${toastCopiado
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 translate-y-3 pointer-events-none"
                        }
                    `}
                >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                        </svg>
                    </span>
                    {numSeleccionados > 0
                        ? `${numSeleccionados} registro${numSeleccionados !== 1 ? "s" : ""} copiado${numSeleccionados !== 1 ? "s" : ""}`
                        : "Registros copiados"
                    }
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+V para pegar</span>
                </div>,
                document.body
            )}

        </section>
    )
}