"use client";

import { HistorialStats } from "./HistorialStats";
import { BackToWeeksButton } from "./BackToWeeksButton";
import { BackToHomeButton } from "./BackToHomeButton";

export function HistorialHeader({
  vistaSemanas,
  semanaSeleccionada,
  totalSemana,
  count,
  onVolver,
  onInicio,
  onAgregar,
}) {
  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl px-5 py-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* ── Título + contador ── */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {vistaSemanas
              ? "Historial general"
              : `${semanaSeleccionada?.fecha_inicio} / ${semanaSeleccionada?.fecha_fin}`}
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {vistaSemanas
              ? `${count} semana${count !== 1 ? "s" : ""}`
              : `${count} técnico${count !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── Acciones ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {!vistaSemanas && (
            <>
              <HistorialStats totalSemana={totalSemana} />

              <button
                onClick={onAgregar}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-indigo-500/90 dark:bg-indigo-600/90 text-white font-medium shadow-sm hover:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-95 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>

              <BackToWeeksButton onClick={onVolver} />
            </>
          )}

          <BackToHomeButton onClick={onInicio} />
        </div>
      </div>
    </div>
  );
}