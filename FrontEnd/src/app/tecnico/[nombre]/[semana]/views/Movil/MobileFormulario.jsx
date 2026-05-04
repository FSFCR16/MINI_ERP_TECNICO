"use client";
import { CellRenderer } from "../../tableRow/renderCell";

export function MobileFormulario({
  columnasTablaEditable,
  columnasDeshabilitdasGenerales,
  rowData,
  setRow,
  data,
  tieneError,
  moverseEntreCeldas,
  baseRef,
  setNotas,
  isMobile,
  handleBtnAgregar,
}) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/40 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 text-sm">Nuevo registro</h2>
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-sky-100/80 text-sky-600 border border-sky-200/60">
          Semana activa
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {columnasTablaEditable.map((col, index) => (
          <div
            key={col.key}
            className={`flex flex-col gap-1 ${col.fullWidth ? "col-span-2" : ""}`}
          >
            <label className="text-[11px] text-slate-500 font-medium pl-1">{col.label}</label>
            <div className="bg-white/50 border border-white/60 rounded-xl overflow-hidden">
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
                isMobile={isMobile}
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
          + Agregar registro
        </button>
      </div>
    </div>
  );
}