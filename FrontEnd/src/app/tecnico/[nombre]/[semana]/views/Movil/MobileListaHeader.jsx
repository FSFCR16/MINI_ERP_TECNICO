"use client";
import { useClipboardRegistros, useSeleccionStore } from "@/app/stores/useClipboardStore";
import { BuscadorRegistros } from "../../components/BuscadorRegistros";
import { useClipboardStore } from "@/app/stores/useClipboardStore";

export function MobileListaHeader({
  listRegistro,
  listaVisible,
  elementosAEliminar,
  toggleSeleccionTodos,
  eliminarSeleccionados,
  setRegistrosFiltrados,
  seleccionSize,
  copiar,
  pegar,
}) {
  const clipboardRegistros = useClipboardRegistros();
  const hayClipboard = clipboardRegistros?.length > 0;
  const hayCopiaSeleccion = seleccionSize > 0;
  const limpiarSeleccion = useSeleccionStore(s => s.limpiarSeleccion);
  // Importar limpiarClipboard del store
  const limpiarClipboard = useClipboardStore(s => s.limpiarClipboard);
  return (
    <div className="flex flex-col gap-2">

      {/* FILA 1: conteo + acciones */}
      <div className="flex justify-between items-center px-1 flex-wrap gap-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-600">
            {listaVisible.length} / {listRegistro.length} registro{listRegistro.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={toggleSeleccionTodos}
            className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/60 border border-white/50 active:scale-95 transition"
          >
            {elementosAEliminar.length === listRegistro.length ? "Deseleccionar" : "Todos"}
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">

          {/* Limpiar selección de copia */}
          {hayCopiaSeleccion && (
            <button
              onClick={limpiarSeleccion}
              className="text-xs text-slate-400 font-medium px-2 py-1 rounded-full bg-white/60 border border-white/50 active:scale-95 transition"
            >
              ✕
            </button>
          )}

          {/* Copiar N */}
          {hayCopiaSeleccion && (
            <button
              onClick={copiar}
              className="flex items-center gap-1 text-xs text-violet-700 font-semibold px-3 py-1 rounded-full bg-violet-100/90 border border-violet-300/70 active:scale-95 transition shadow-sm"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar {seleccionSize}
            </button>
          )}

          {/* Pegar — agregar el ✕ al lado */}
          {hayClipboard && (
            <div className="flex items-center gap-1">
              <button
                onClick={pegar}
                className="flex items-center gap-1 text-xs text-violet-600 font-semibold px-3 py-1 rounded-full bg-violet-50/90 border border-violet-200/70 active:scale-95 transition shadow-sm"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Pegar {clipboardRegistros.length}
              </button>
              <button
                onClick={limpiarClipboard}
                className="text-xs text-slate-400 font-medium px-2 py-1 rounded-full bg-white/60 border border-white/50 active:scale-95 transition"
              >
                ✕
              </button>
            </div>
          )}
          {/* Eliminar N */}
          {elementosAEliminar.length > 0 && (
            <button
              onClick={eliminarSeleccionados}
              className="text-xs text-rose-500 font-medium px-3 py-1 rounded-full bg-rose-50/80 border border-rose-100 active:scale-95 transition"
            >
              Eliminar {elementosAEliminar.length}
            </button>
          )}
        </div>
      </div>

      {/* FILA 2: Buscador */}
      <BuscadorRegistros
        registros={listRegistro}
        onFiltrar={setRegistrosFiltrados}
      />
    </div>
  );
}