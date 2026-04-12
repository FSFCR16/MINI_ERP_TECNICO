import React from "react"
import { actualizarPorcentajeCC } from "../../../../../Utils/api.js"
import { procesarDatosTecnico } from "../../../../../Utils/api.js"

export const CellRenderer = React.memo(({
  col,
  index,
  rowData,
  setRow,
  data,
  tieneError,
  setCellRef,
  moverseEntreCeldas,
  columnasDeshabilitdasGenerales,
  setNotas,
  isMobile
}) => {


  const component =
    typeof col.component === "function"
      ? col.component({ rowData, data })
      : col.component ?? col.tipo;

  const rawOptions =
    typeof col.options === "function"
      ? col.options({ rowData, data })
      : col.options ?? [];

  const options = (rawOptions || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  const baseRef = (el) => {
    if (el) setCellRef(index, el);
  };

  const baseClassesSelect = `w-full px-2 py-1 text-[13px] rounded-lg border backdrop-blur-md outline-none transition
    ${
      tieneError(col.key)
        ? "border-red-400 bg-red-50/70 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
        : "border-white/40 bg-white/60"
  }`;

  const baseClasesMovilSelect = `px-3 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md outline-none text-sm
    ${
      tieneError(col.key)
        ? "border-red-400 bg-red-50/70 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
        : "border-white/40 bg-white/60"
    }`;

  const basesClasesIntput=`w-full p-1 text-[13px] rounded-lg outline-none text-center transition
    ${
       tieneError(col.key)
        ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
        : "bg-transparent hover:bg-slate-100"
    }`;

  const basesClasesIntputMovil=`px-3 py-2 rounded-xl bg-white/50 text-sm
      ${
       tieneError(col.key)
        ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
        : "bg-transparent hover:bg-slate-100"
    }`;

  const value = rowData?.[col.key] ?? "";

  const setCell = (newVal) => {
    const parsed =
      col.inputType === "number" && newVal !== "" ? Number(newVal) : newVal;

    setRow((prev) => {
      let next = { ...prev, [col.key]: parsed }

      // ── Cambio de job: recarga datos del técnico ───────────────────────────
      if (col.key === "job" && component === "select" && parsed) {
        const found = data.find((d) => d.job === parsed);
        if (found) {
          const processed = procesarDatosTecnico(found);
          setNotas(processed?.notas);
          return { ...next, ...processed };
        }
      }

      // ── Cambio de valor_servicio: restaura base para que se recalcule ──────
      if (col.key === "valor_servicio") {
        next.porcentaje_cc_base = prev.porcentaje_cc_original
      }

      // ── El usuario edita porcentaje_cc manualmente: desactiva autocálculo ──
      if (col.key === "porcentaje_cc") {
        next.porcentaje_cc_base = null
      }

      // ── Cambio de tipo_pago: recalcula porcentaje_cc con el valor actual ───
      if (col.key === "tipo_pago") {
        next.porcentaje_cc_base = prev.porcentaje_cc_original
      }

      // ── Autocompleta porcentaje_cc en dólares en tiempo real ───────────────
      return actualizarPorcentajeCC(next)
    });
  };

  const onKeyDown = (e) => moverseEntreCeldas?.(e, index);

  switch (component) {

    case "select":
      return (
        <select
          ref={baseRef}
          onKeyDown={onKeyDown}
          value={value}
          onChange={(e) => setCell(e.target.value)}
          className={`${isMobile ? baseClasesMovilSelect : baseClassesSelect} text-[13px] px-2 py-1`}
        >
          <option value="">Seleccione...</option>
          {options.map((opt, i) => (
            <option key={i} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    default:
      const inputType =
        col.inputType || (col.tipo === "number" ? "number" : "text");

      return (
        <input
          ref={baseRef}
          type={inputType}
          onKeyDown={onKeyDown}
          disabled={columnasDeshabilitdasGenerales?.includes(col.key)}
          value={value === 0 ? "" : value}
          onChange={(e) => setCell(e.target.value)}
          className={isMobile ? basesClasesIntputMovil : basesClasesIntput}
        />
      );
  }

}, (prev, next) => {
  // Comparador: re-renderiza si cambió el valor de esta celda,
  // o si cambió tipo_pago (afecta visibilidad/cálculo de porcentaje_cc),
  // o si cambió el error de esta celda
  return (
    prev.rowData?.[prev.col.key] === next.rowData?.[next.col.key] &&
    prev.rowData?.tipo_pago       === next.rowData?.tipo_pago       &&
    prev.rowData?.porcentaje_cc   === next.rowData?.porcentaje_cc   &&
    prev.tieneError(prev.col.key) === next.tieneError(next.col.key) &&
    prev.isMobile                 === next.isMobile
  );
});

CellRenderer.displayName = "CellRenderer";