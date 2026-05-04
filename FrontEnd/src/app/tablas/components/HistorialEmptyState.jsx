"use client";

export function HistorialEmptyState({ mensaje = "Sin resultados", error = false }) {
  return (
    <div className="text-center text-sm text-slate-400 py-12">
      <div className="bg-white/55 backdrop-blur-xl border border-white/40 rounded-2xl px-6 py-8 shadow-sm">
        <p className={error ? "text-rose-500 font-medium" : "text-slate-400"}>
          {mensaje}
        </p>
      </div>
    </div>
  );
}