"use client";

import { formatearNumero } from "@/Utils/api.js";

export function HistorialStats({ totalSemana }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 border border-white/50">
      <span className="text-[11px] text-slate-400">Total semana</span>
      <span className="text-sm font-bold text-indigo-600">
        ${formatearNumero(totalSemana)}
      </span>
    </div>
  );
}