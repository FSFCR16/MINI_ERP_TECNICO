"use client";
import { CellRenderer } from "../../tableRow/renderCell";

export function MobileCardEdit({
  row,
  columnasTablaGeneral,
  columnasDeshabilitdasGenerales,
  actualizarCeldaRegistro,
  setNotas,
  data,
}) {
  return (
    <div className="px-4 py-3 grid grid-cols-2 gap-3">
      {columnasTablaGeneral
        .filter(col => col.key !== "check_box" && col.key !== "total")
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
                    const next = typeof valOrFn === "function" ? valOrFn(row) : valOrFn;
                    Object.keys(next).forEach(k => {
                      if (next[k] !== row[k]) {
                        actualizarCeldaRegistro(row.id_registro, k, next[k]);
                      }
                    });
                  }}
                  data={data}
                  tieneError={() => false}
                  setCellRef={() => {}}
                  moverseEntreCeldas={() => {}}
                  columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                  setNotas={setNotas}
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
  );
}