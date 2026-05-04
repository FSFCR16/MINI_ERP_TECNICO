"use client";

export function MobileCardTotales({ row }) {
  const totalNegativo = Number(row.total) < 0;

  return (
    <div className="mx-4 mb-3 mt-1 flex gap-2">
      <div className="flex-1 bg-indigo-50/60 border border-indigo-100/60 rounded-2xl p-2.5 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Servicio</p>
        <p className="text-sm font-bold text-indigo-600">${row.valor_servicio ?? "—"}</p>
      </div>
      <div className={`flex-1 border rounded-2xl p-2.5 text-center ${
        totalNegativo ? "bg-rose-50/60 border-rose-100/60" : "bg-slate-50/60 border-slate-100/60"
      }`}>
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
        <p className={`text-sm font-bold ${totalNegativo ? "text-rose-500" : "text-slate-800"}`}>
          ${row.total ?? "—"}
        </p>
      </div>
    </div>
  );
}