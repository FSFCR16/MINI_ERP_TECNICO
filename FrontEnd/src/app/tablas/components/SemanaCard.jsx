"use client";

export function SemanaCard({ semana, onVer, onEliminar }) {
  return (
    <div className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/70 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {semana.fecha_inicio} / {semana.fecha_fin}
          </p>
          {semana.total_tecnicos != null && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {semana.total_tecnicos} técnico{semana.total_tecnicos !== 1 ? "s" : ""}
              {semana.total_registros != null && ` · ${semana.total_registros} registros`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onVer}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/60 border border-white/50 text-indigo-600 font-medium hover:border-indigo-300 hover:bg-indigo-100 active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver
          </button>

          <button
            onClick={onEliminar}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/60 border border-white/50 text-rose-400 hover:bg-rose-50/60 hover:text-rose-500 active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}