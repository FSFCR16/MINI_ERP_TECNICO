import { CellRenderer } from '../../tableRow/renderCell.jsx'

export function TablaEditable({ state, handlers, nav }) {

    const {
        columnasTablaEditable,
        columnasDeshabilitdasGenerales,
        rowData,
        data,
        tieneError,
        activeHeader,
    } = state

    const { setRow, setNotas, setActiveHeader } = handlers
    const { moverseEntreCeldas, baseRef } = nav

    return (
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
                                    data={data}
                                    tieneError={tieneError}
                                    setCellRef={baseRef}
                                    moverseEntreCeldas={moverseEntreCeldas}
                                    columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                                    setNotas={setNotas}
                                    isMobile={false}
                                />
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}