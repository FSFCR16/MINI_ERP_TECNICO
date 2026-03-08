import { is } from "zod/v4/locales";

export const CellRenderer = ({
  col,
  index,
  rowData,
  setRow,
  data,
  tieneError,
  setCellRef, // ahora viene desde page
  moverseEntreCeldas,
  columnasDeshabilitdasGenerales,
  procesarDatosTecnico,
  setNotas,
  isMobile
}) => {
  // decidir componente
  const component =
    typeof col.component === "function"
      ? col.component({ rowData, data })
      : col.component ?? col.tipo;

  // obtener opciones
  const rawOptions =
    typeof col.options === "function"
      ? col.options({ rowData, data })
      : col.options ?? [];

  // normalizar opciones
  const options = (rawOptions || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  // referencia a la celda
  const baseRef = (el) => {
    if (!el) return;
    setCellRef(index, el);
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
    }`
  const basesClasesIntputMovil=`px-3 py-2 rounded-xl bg-white/50 text-sm
      ${
       tieneError(col.key)
        ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
        : "bg-transparent hover:bg-slate-100"
    }`

  // valor de la celda
  const value = rowData?.[col.key] ?? "";

  const setCell = (newVal) => {
    const parsed =
      col.inputType === "number" && newVal !== "" ? Number(newVal) : newVal;

    setRow((prev) => {
      const next = { ...prev, [col.key]: parsed };

      // lógica especial para job
      if (col.key === "job" && component === "select" && parsed) {
        const found = data.find((d) => d.job === parsed);

        if (found) {
          const processed = procesarDatosTecnico(found);
          setNotas(processed?.notas);
          return { ...next, ...processed };
        }
      }
      
      return next;
    });
};
  // navegación teclado
  const onKeyDown = (e) => moverseEntreCeldas?.(e, index);

  switch (component) {

    case "select":
      return (
        <>
          <select
            ref={baseRef}
            onKeyDown={onKeyDown}
            value={value}
            onChange={(e) => setCell(e.target.value)}
            className={`${isMobile ? baseClasesMovilSelect:baseClassesSelect} text-[13px] px-2 py-1`}
          >
            <option value="">Seleccione...</option>

            {options.map((opt, i) => (
              <option key={i} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      );


    default:

      const inputType =
        col.inputType || (col.tipo === "number" ? "number" : "text");

      return (
        <>
          <input
            ref={baseRef}
            type={inputType}
            onKeyDown={onKeyDown}
            disabled={columnasDeshabilitdasGenerales?.includes(col.key)}
            value={value === 0 ? "" : value}
            onChange={(e) => setCell(e.target.value)}
            className={isMobile ? basesClasesIntputMovil : basesClasesIntput}
          />
        </>
      );
  }
};