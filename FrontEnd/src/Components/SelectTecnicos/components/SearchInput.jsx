"use client";

export function SearchInput({
  busqueda,
  tecnicoValido,
  errorInput,
  onBusquedaChange,
  onKeyDown,
  onFocus,
}) {
  return (
    <div className="flex-1 flex flex-col gap-1 min-w-0">
      <div className="relative">
        <input
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder="Buscar técnico..."
          className={[
            "w-full rounded-2xl border px-4 py-3 pr-12 text-sm outline-none transition-all duration-200",
            "bg-white/70 backdrop-blur-xl shadow-sm",
            tecnicoValido
              ? "border-emerald-300 ring-2 ring-emerald-200/60"
              : errorInput
              ? "border-red-300 ring-2 ring-red-200/60"
              : "border-white/50 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60",
          ].join(" ")}
          autoComplete="off"
          spellCheck="false"
        />

        {tecnicoValido && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-sm">
            ✓
          </div>
        )}
      </div>

      {errorInput ? (
        <p className="text-xs text-red-500 pl-1">{errorInput}</p>
      ) : (
        <p className="text-xs text-slate-400 pl-1">
          Escribe o selecciona un técnico de la lista
        </p>
      )}
    </div>
  );
}