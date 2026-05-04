"use client";

export function MobileCardDetail({ row, columnasTablaGeneral }) {
  return (
    <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {columnasTablaGeneral
        .filter(col =>
          col.key !== "check_box" &&
          col.key !== "valor_servicio" &&
          col.key !== "total"
        )
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
  );
}