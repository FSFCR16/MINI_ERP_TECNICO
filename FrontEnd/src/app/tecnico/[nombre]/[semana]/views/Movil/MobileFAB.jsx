"use client";
import { useState } from "react";

export function MobileFAB({ openModal }) {
  const [fabAbierto, setFabAbierto] = useState(false);

  const accion = (tipo) => {
    openModal(tipo);
    setFabAbierto(false);
  };

  return (
    <>
      {fabAbierto && (
        <div className="fixed inset-0 z-40" onClick={() => setFabAbierto(false)} />
      )}

      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2 z-50">
        <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${
          fabAbierto
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-full px-3 py-1 shadow-sm">
              Mensaje
            </span>
            <button
              onClick={() => accion("AUTO_MESSAGE")}
              className="w-11 h-11 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 text-indigo-600 dark:text-indigo-400 shadow-md flex items-center justify-center active:scale-95 transition text-lg"
            >
              💬
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-full px-3 py-1 shadow-sm">
              Notas
            </span>
            <button
              onClick={() => accion("NOTAS")}
              className="w-11 h-11 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 text-amber-500 dark:text-amber-400 shadow-md flex items-center justify-center active:scale-95 transition text-lg"
            >
              📝
            </button>
          </div>
        </div>

        <button
          onClick={() => setFabAbierto(prev => !prev)}
          className={`w-[52px] h-[52px] rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 ${
            fabAbierto ? "rotate-45" : ""
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </>
  );
}