"use client";
import { memo } from "react";
import { MobileCardEdit } from "./MobileCardEdit";
import { MobileCardDetail } from "./MobileCardDetail";
import { MobileCardTotales } from "./MobileCardTotales";
import { useMobileClipboard } from "../../hooks/useMobileClipboard";

export const MobileCard = memo(function MobileCard({
  row,
  index,
  abierto,
  modoEdicion,
  seleccionado,
  columnasTablaGeneral,
  columnasDeshabilitdasGenerales,
  toggleExpandido,
  toggleEditar,
  toggleSeleccion,
  actualizarCeldaRegistro,
  setNotas,
  data,
  iniciarDrag,
  listRegistro,
}) {
  const rowId = row.id_registro ?? row.id;
  const totalNegativo = Number(row.total) < 0;

  const { enSeleccion, handleCopiarBtn } = useMobileClipboard({
    rowId,
    listRegistro,
    iniciarDrag,
  });

  return (
    <div className={`backdrop-blur-2xl border rounded-3xl shadow-md overflow-hidden transition-all duration-300 ${
      enSeleccion
        ? "border-violet-300/70 dark:border-violet-600/60 bg-violet-50/50 dark:bg-violet-900/20 shadow-violet-100/60 dark:shadow-violet-900/30"
        : seleccionado
        ? "border-indigo-300/60 dark:border-indigo-600/50 bg-indigo-50/40 dark:bg-indigo-900/20"
        : modoEdicion
        ? "border-sky-300/60 dark:border-sky-600/50 bg-sky-50/20 dark:bg-sky-900/20"
        : "border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60"
    }`}>

      {/* CABECERA */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-white/40 dark:active:bg-slate-700/40 transition"
        onClick={() => toggleExpandido(index)}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={() => toggleSeleccion(row)}
            className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
          />
        </div>

        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 min-w-[20px]">
          #{index + 1}
        </span>

        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {row.nombre ?? row.tipo_pago ?? "—"}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Servicio: ${row.valor_servicio ?? "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${totalNegativo ? "text-rose-500 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"}`}>
            ${row.total ?? "—"}
          </span>

          {/* Botón copiar */}
          <button
            onClick={handleCopiarBtn}
            title={enSeleccion ? "Extender selección" : "Seleccionar para copiar"}
            className={`w-7 h-7 flex items-center justify-center rounded-xl border transition active:scale-95 ${
              enSeleccion
                ? "bg-violet-500 dark:bg-violet-600 text-white border-violet-400 dark:border-violet-500 shadow-sm"
                : "bg-white/60 dark:bg-slate-700/60 text-violet-400 dark:text-violet-400 border-white/50 dark:border-slate-600/50"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Botón editar */}
          <button
            onClick={e => toggleEditar(e, index)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition active:scale-95 ${
              modoEdicion
                ? "bg-sky-500 dark:bg-sky-600 text-white border-sky-400 dark:border-sky-500"
                : "bg-white/60 dark:bg-slate-700/60 text-sky-600 dark:text-sky-400 border-white/50 dark:border-slate-600/50"
            }`}
          >
            {modoEdicion ? "✓ Listo" : "Editar"}
          </button>

          <svg
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${abierto ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* CONTENIDO EXPANDIDO */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        abierto ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="border-t border-white/40 dark:border-slate-700/40 mx-4" />

        {modoEdicion ? (
          <MobileCardEdit
            row={row}
            columnasTablaGeneral={columnasTablaGeneral}
            columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
            actualizarCeldaRegistro={actualizarCeldaRegistro}
            setNotas={setNotas}
            data={data}
          />
        ) : (
          <MobileCardDetail
            row={row}
            columnasTablaGeneral={columnasTablaGeneral}
          />
        )}

        <MobileCardTotales row={row} />
      </div>
    </div>
  );
});