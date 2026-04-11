export function TablaTrabajos({ state, handlers, nav }) {

    const {
        trabajos,
        elementosAEliminar,
        columnasTablaGeneral,
        activeCell,
        activeHeader,
        celdaEditando,
        guardando,
    } = state

    const {
        eliminarSeleccionados,
        toggleSeleccion,
        toggleSeleccionTodos,
        actualizarCeldaTrabajo,
        setActiveCell,
        setActiveHeader,
        setCeldaEditando,
    } = handlers

    const {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEnTablaGeneral,
    } = nav

    return (
        <section className="w-full flex-1 min-h-0 overflow-hidden rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border border-white/40 flex flex-col">

            {/* HEADER DE TABLA */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/40">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Registros
                </span>

                {elementosAEliminar.length > 0 && (
                    <button
                        className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-xl bg-rose-50/80 border border-rose-200/60 text-rose-500 font-medium hover:bg-rose-100/80 active:scale-95 transition-all duration-200 cursor-pointer"
                        onClick={eliminarSeleccionados}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Eliminar {elementosAEliminar.length}
                    </button>
                )}
            </div>

            <div className="w-full flex-1 overflow-auto custom-scroll">
                <table className="w-full border-collapse table-fixed">

                    <thead className="bg-white/60 backdrop-blur-md text-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-1 py-1 border-b border-white/40 text-center" style={{ width: "32px" }}>
                                <input
                                    ref={checkboxMaestroRef}
                                    type="checkbox"
                                    className="w-3.5 h-3.5 cursor-pointer"
                                    checked={trabajos.length > 0 && elementosAEliminar.length === trabajos.length}
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
                        {trabajos.map((row, indexrow) => (
                            <tr
                                key={row.id ?? indexrow}
                                className={`transition duration-200 hover:bg-white/40 ${elementosAEliminar.includes(row) ? "bg-blue-50/60" : ""}`}
                            >
                                {columnasTablaGeneral.map((col, indexCol) => {
                                    const cellKey = `${indexrow}-${indexCol}`
                                    const value = row[col.key]
                                    const esEditable = col.editable !== false

                                    return (
                                        <td
                                            key={indexCol}
                                            className={`px-1 py-1 border-b border-white/30 ${indexCol === 0 ? "text-center w-[32px]" : "text-right"}`}
                                        >
                                            {indexCol === 0 ? (
                                                <input
                                                    type="checkbox"
                                                    checked={elementosAEliminar.includes(row)}
                                                    onChange={() => toggleSeleccion(row)}
                                                    className="w-3.5 h-3.5 cursor-pointer"
                                                />
                                            ) : celdaEditando === cellKey ? (
                                                <input
                                                    autoFocus
                                                    type={typeof value === "number" ? "number" : "text"}
                                                    defaultValue={value}
                                                    className="w-full text-[12px] bg-white/80 border border-indigo-300/60 rounded px-1 outline-none"
                                                    onBlur={(e) => {
                                                        if (guardandoRef.current) { guardandoRef.current = false; return }
                                                        const val = typeof value === "number" ? Number(e.target.value) : e.target.value
                                                        actualizarCeldaTrabajo(indexrow, col.key, val)
                                                        setCeldaEditando(null)
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            guardandoRef.current = true
                                                            e.target.blur()
                                                            setCeldaEditando(null)
                                                            return
                                                        }
                                                        if (e.key === "Enter") {
                                                            e.preventDefault()
                                                            guardandoRef.current = true
                                                            const val = typeof value === "number" ? Number(e.target.value) : e.target.value
                                                            actualizarCeldaTrabajo(indexrow, col.key, val)
                                                            setCeldaEditando(null)
                                                            setTimeout(() => celdasTablaRef.current[`${indexrow + 1}-${indexCol}`]?.focus(), 0)
                                                            return
                                                        }
                                                        if (e.key === "Tab") {
                                                            e.preventDefault()
                                                            guardandoRef.current = true
                                                            const val = typeof value === "number" ? Number(e.target.value) : e.target.value
                                                            actualizarCeldaTrabajo(indexrow, col.key, val)
                                                            setCeldaEditando(null)
                                                            setTimeout(() => celdasTablaRef.current[`${indexrow}-${indexCol + 1}`]?.focus(), 0)
                                                            return
                                                        }
                                                    }}
                                                    ref={el => { celdasTablaRef.current[cellKey] = el }}
                                                />
                                            ) : (
                                                <div
                                                    tabIndex={0}
                                                    onDoubleClick={() => { if (esEditable) setCeldaEditando(cellKey) }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault()
                                                            if (esEditable) { setCeldaEditando(cellKey); return }
                                                        }
                                                        moverseEnTablaGeneral(e, indexrow, indexCol)
                                                    }}
                                                    ref={el => { celdasTablaRef.current[cellKey] = el }}
                                                    onClick={() => setActiveCell(activeCell === cellKey ? null : cellKey)}
                                                    className={`flex justify-start overflow-hidden whitespace-nowrap text-ellipsis text-[12px] ${esEditable ? "cursor-pointer" : "cursor-default"} text-slate-700`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <span className={`inline-block ${activeCell === cellKey ? "animate-scrollText" : "truncate"}`}>
                                                            {value ?? "—"}
                                                        </span>
                                                        {guardando?.[indexrow] && (
                                                            <span className="text-[9px] text-blue-500 animate-pulse">...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>

                </table>
            </div>
        </section>
    )
}