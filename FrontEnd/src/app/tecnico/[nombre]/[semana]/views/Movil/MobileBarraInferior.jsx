"use client";

export function MobileBarraInferior({
  haycambiosPendientes,
  guardando,
  guardarCambios,
  revertirCambios,
  openModal,
}) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-white/50 dark:border-slate-700/50 px-4 py-3 flex gap-2 z-40">
      {haycambiosPendientes && (
        <>
          <button
            onClick={() => revertirCambios(false)}
            disabled={guardando}
            className="flex-1 py-2 text-xs rounded-2xl bg-white/60 dark:bg-slate-700/60 border border-white/50 dark:border-slate-600/50 text-rose-500 dark:text-rose-400 font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
          >
            Revertir
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex-1 py-2 text-xs rounded-2xl font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
            style={{ backgroundColor: guardando ? "#86efac" : "#22c55e", color: "white" }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </>
      )}
      <button
        onClick={() => openModal("EXPORTAR")}
        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 dark:bg-slate-700/60 border border-white/50 dark:border-slate-600/50 text-green-600 dark:text-green-400 font-semibold shadow-sm active:scale-95 transition"
      >
        Exportar
      </button>
      <button
        onClick={() => openModal("FINALIZAR")}
        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 dark:bg-slate-700/60 border border-white/50 dark:border-slate-600/50 text-sky-600 dark:text-sky-400 font-semibold shadow-sm active:scale-95 transition"
      >
        Finalizar
      </button>
    </div>
  );
}