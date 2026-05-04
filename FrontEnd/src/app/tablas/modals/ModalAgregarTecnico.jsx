"use client";

import { useEffect, useMemo, useRef } from "react";

export function ModalAgregarTecnico({
  isOpen,
  onClose,
  tecnicos = [],
  busquedaTecnico,
  setBusquedaTecnico,
  indexResaltado,
  setIndexResaltado,
  itemsRef,
  onConfirmar,
  onKeyDown,
}) {
  const containerRef = useRef(null);

  const filtradosTecnicos = useMemo(() => {
    const texto = busquedaTecnico.trim().toLowerCase();
    if (!texto) return [];
    return tecnicos.filter((t) => String(t).toLowerCase().startsWith(texto));
  }, [tecnicos, busquedaTecnico]);

  const tecnicoValido = useMemo(() => {
    return tecnicos.includes(busquedaTecnico.trim().toUpperCase());
  }, [tecnicos, busquedaTecnico]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (indexResaltado >= 0 && itemsRef?.current?.[indexResaltado]) {
      itemsRef.current[indexResaltado]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [indexResaltado, isOpen, itemsRef]);

  if (!isOpen) return null;

  const seleccionarTecnico = (nombre) => {
    setBusquedaTecnico(nombre);
    setIndexResaltado(-1);
  };

  const handleConfirmarClick = () => {
    if (!tecnicoValido) return;
    onConfirmar?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar modal"
      />

      <div
        ref={containerRef}
        className="relative w-full max-w-lg rounded-3xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/50 bg-white/40">
          <h2 className="text-sm font-semibold text-slate-800">
            Agregar técnico a la semana
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Busca y selecciona un técnico para continuar
          </p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <input
              value={busquedaTecnico}
              onChange={(e) => {
                setBusquedaTecnico(e.target.value);
                setIndexResaltado(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar técnico..."
              autoComplete="off"
              spellCheck="false"
              className={[
                "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all",
                "bg-white/70 backdrop-blur-xl",
                tecnicoValido
                  ? "border-emerald-300 ring-2 ring-emerald-200/60"
                  : "border-white/50 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100/70",
              ].join(" ")}
            />

            <p className="text-[11px] text-slate-400 pl-1">
              Usa las flechas para navegar y Enter para seleccionar.
            </p>
          </div>

          <div className="max-h-60 overflow-auto rounded-2xl border border-white/50 bg-white/60 p-2">
            {filtradosTecnicos.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filtradosTecnicos.map((nombre, index) => {
                  const activo = index === indexResaltado;

                  return (
                    <button
                      key={nombre}
                      ref={(node) => {
                        if (itemsRef?.current) itemsRef.current[index] = node;
                      }}
                      type="button"
                      onClick={() => seleccionarTecnico(nombre)}
                      className={[
                        "w-full text-left px-4 py-3 rounded-2xl text-sm transition-all duration-200",
                        "flex items-center justify-between border border-transparent",
                        activo
                          ? "bg-indigo-50 text-indigo-700 shadow-sm border-indigo-100 ring-1 ring-indigo-200/40"
                          : "bg-transparent text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span className="truncate">{nombre}</span>
                      {activo && (
                        <span className="ml-3 text-[11px] font-medium text-indigo-500">
                          ●
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                No se encontraron técnicos
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl bg-white/70 border border-white/50 text-slate-500 font-medium hover:bg-white/90 active:scale-95 transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmarClick}
              disabled={!tecnicoValido}
              className={[
                "px-4 py-2 text-xs rounded-xl font-medium transition-all",
                tecnicoValido
                  ? "bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95 shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed",
              ].join(" ")}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}