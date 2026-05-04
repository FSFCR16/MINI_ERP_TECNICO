"use client";

import { useEffect, useRef } from "react";

export function DropdownList({
  filtrados,
  indexResaltado,
  onSelect,
  setItemRef,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (indexResaltado >= 0) {
      const node = containerRef.current?.querySelector(
        `[data-index="${indexResaltado}"]`
      );
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [indexResaltado]);

  if (!filtrados.length) {
    return (
      <div className="absolute z-30 mt-3 w-full rounded-3xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-2xl p-4 text-center text-sm text-slate-500">
        No se encontraron técnicos
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-30 mt-3 w-full max-h-72 overflow-auto rounded-3xl border border-white/40 bg-white/85 backdrop-blur-xl shadow-2xl p-2"
    >
      <div className="flex flex-col gap-1">
        {filtrados.map((nombre, index) => {
          const activo = index === indexResaltado;

          return (
            <button
              key={nombre}
              ref={(node) => setItemRef(node, index)}
              data-index={index}
              type="button"
              onClick={() => onSelect(nombre)}
              className={[
                "w-full text-left px-4 py-3 rounded-2xl text-sm transition-all duration-200",
                "flex items-center justify-between",
                "border border-transparent",
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
    </div>
  );
}