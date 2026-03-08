"use client";
import { CellRenderer } from "../tableRow/renderCell";
export function MobileView({
  rowData,
  setRow,
  columnasTablaEditable = [],
  columnasDeshabilitdasGenerales = [],
  columnas = [],
  data = [],
  selectedJob,
  handleJobChange,
  inputsReferencias,
  moverseEntreCeldas,
  handleBtnAgregar,
  listRegistro = [],   // ✅ ESTE NOMBRE
  toggleSeleccion,
  elementosAEliminar = [],
  eliminarSeleccionados,
  setIsOpen,
  setModalTipo,
  tieneError,
  baseRef,
  procesarDatosTecnico,
  setNotas,
  isMobile
}) {

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 p-4 flex flex-col gap-6 pb-16">

      {/* ===================== FORMULARIO (MISMA LÓGICA QUE TABLA) ===================== */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-4 flex flex-col gap-4">

        <h2 className="font-semibold text-slate-800 text-sm">
          Nuevo Registro
        </h2>

        {columnasTablaEditable.map((col, index) => {
          return (
            <div key={col.key} className="flex flex-col gap-1">
                <label className="text-xs text-slate-600 font-medium">
                  {col.label}
                </label>
                <CellRenderer
                col={col}
                index={index}
                rowData={rowData}
                setRow={setRow}
                data={data}
                tieneError={tieneError}
                setCellRef={baseRef}
                moverseEntreCeldas={moverseEntreCeldas}
                columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                procesarDatosTecnico={procesarDatosTecnico}
                setNotas = {setNotas}
                isMobile={isMobile}
                />
            </div>
          );
          // if (col.key === "check_box") return null;

          // /* ===================== JOB ===================== */
          // if (col.key === "job") {

          //   if (data.length > 1) {
          //     return (
          //       <div key={col.key} className="flex flex-col gap-1">
          //         <label className="text-xs text-slate-600 font-medium">
          //           {col.label}
          //         </label>

          //         <select
          //           ref={(el) => {
          //             if (!inputsReferencias.current[0]) {
          //               inputsReferencias.current[0] = [];
          //             }
          //             inputsReferencias.current[0][index] = el;
          //           }}
          //           value={selectedJob}
          //           onChange={handleJobChange}
          //           onKeyDown={(e) => moverseEntreCeldas(e, index)}
          //           className="px-3 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md outline-none text-sm"
          //         >
          //           <option value="">Seleccione...</option>
          //           {data.map((item, i) => (
          //             <option key={i} value={item.job}>
          //               {item.job}
          //             </option>
          //           ))}
          //         </select>
          //       </div>
          //     );
          //   }

          //   return (
          //     <div key={col.key} className="flex flex-col gap-1">
          //       <label className="text-xs text-slate-600 font-medium">
          //         {col.label}
          //       </label>
          //       <input
          //         disabled
          //         value={rowData.job || ""}
          //         className="px-3 py-2 rounded-xl bg-white/50 text-sm"
          //       />
          //     </div>
          //   );
          // }

          // /* ===================== TIPO PAGO ===================== */
          // if (col.key === "tipo_pago") {
          //   return (
          //     <div key={col.key} className="flex flex-col gap-1">
          //       <label className="text-xs text-slate-600 font-medium">
          //         {col.label}
          //       </label>

          //       <select
          //         ref={(el) => {
          //           if (!inputsReferencias.current[0]) {
          //             inputsReferencias.current[0] = [];
          //           }
          //           inputsReferencias.current[0][index] = el;
          //         }}
          //         value={rowData.tipo_pago ?? ""}
          //         onKeyDown={(e) => moverseEntreCeldas(e, index)}
          //         onChange={(e) => {
          //           setRow({
          //             ...rowData,
          //             tipo_pago: e.target.value
          //           });
          //         }}
          //         className={`px-3 py-2 rounded-xl border border-white/40 bg-white/60 backdrop-blur-md outline-none text-sm
          //           ${tieneError(col.key)
          //           ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
          //           : "bg-transparent hover:bg-slate-100"}`}
                  
          //       >
          //         <option value="">Seleccione...</option>
          //         {rowData.opciones_pago &&
          //           rowData.opciones_pago.map((item, i) => (
          //             <option key={i} value={item}>
          //               {item}
          //             </option>
          //           ))}
          //       </select>
          //     </div>
          //   );
          // }

          // /* ===================== INPUT NORMAL ===================== */
          // return (
          //   <div key={col.key} className="flex flex-col gap-1">
          //     <label className="text-xs text-slate-600 font-medium">
          //       {col.label}
          //     </label>

          //     <input
          //       type={col.tipo}
          //       ref={(el) => {
          //         if (!inputsReferencias.current[0]) {
          //           inputsReferencias.current[0] = [];
          //         }
          //         inputsReferencias.current[0][index] = el;
          //       }}
          //       disabled={columnasDeshabilitdasGenerales.includes(col.key)}
          //       value={rowData[col.key] == 0 ? "" : rowData[col.key] ?? ""}
          //       onKeyDown={(e) => moverseEntreCeldas(e, index)}
          //       onChange={(e) => {
          //         const { value, type } = e.target;

          //         setRow({
          //           ...rowData,
          //           [col.key]:
          //             type === "number" && value !== ""
          //               ? Number(value)
          //               : value
          //         });
          //       }}
          //       className={`px-3 py-2 rounded-xl border border-white/40 bg-white/50 outline-none text-sm
          //           ${tieneError(col.key)
          //           ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
          //           : "bg-transparent hover:bg-slate-100"}`}
          //     />
          //   </div>
          // );
        })}

        <button
          onClick={handleBtnAgregar}
          className="mt-2 py-2 rounded-xl bg-white/60 border border-white/40 text-sky-600 font-medium shadow transition active:scale-95 active:brightness-95"
        >
          AGREGAR
        </button>
      </div>


      {/* ===================== CARDS CON TODAS LAS COLUMNAS ===================== */}
      <div className="flex flex-col gap-4">

        {listRegistro.map((row, index) => (
            <div
            key={index}
            className="
                bg-white/60 backdrop-blur-xl
                border border-white/40
                rounded-2xl
                shadow-md
                p-4
                transition-all duration-200
                hover:bg-white/70
            "
            >

            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-slate-800 text-sm">
                Registro #{index + 1}
                </h2>

                <input
                type="checkbox"
                checked={elementosAEliminar.includes(row)}
                onChange={() => toggleSeleccion(row)}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                />
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex gap-4">

                {/* PANEL DINERO */}
                <div className="
                flex flex-col justify-between
                min-w-[90px]
                bg-white/40
                backdrop-blur-md
                border border-white/40
                rounded-xl
                p-3
                text-center
                ">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">
                    Servicio
                    </p>
                    <p className="text-lg font-bold text-indigo-600">
                    ${row.valor_servicio ?? "-"}
                    </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/40">
                    <p className="text-[10px] text-slate-500 uppercase">
                    Total
                    </p>
                    <p className="text-lg font-bold text-slate-800">
                    ${row.total ?? "-"}
                    </p>
                </div>
                </div>

                {/* INFO GRID COMPACTA */}
                <div className="
                grid
                grid-cols-2
                gap-x-4 gap-y-2
                text-xs
                text-slate-700
                flex-1
                ">
                {columnas.filter(
                    (col) =>
                        col.key !== "valor_servicio" &&
                        col.key !== "total"
                    ).map((col) => (
                    <div key={col.key} className="flex flex-col">
                        <span className="text-[10px] text-slate-500">
                            {col.label}
                        </span>
                        <span className="font-semibold break-words">
                            {row[col.key] ?? "-"}
                        </span>
                    </div>
                ))}
                </div>

            </div>

            </div>
        ))}

       </div>


      {/* ===================== BOTONES FIJOS ===================== */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-white/40 p-3 flex justify-between gap-2">
        <button
          className="flex-1 py-2 text-xs rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium shadow transition active:scale-95 active:bg-rose-50"
          onClick={eliminarSeleccionados}
        >
          ELIMINAR
        </button>

        <button
          className="flex-1 py-2 text-xs rounded-xl bg-white/50 border border-white/40 text-green-600 font-medium shadow transition active:scale-95 active:bg-green-50"
          onClick={() => {
            setIsOpen(true);
            setModalTipo("EXPORTAR");
          }}
        >
          EXPORTAR
        </button>

        <button
          className="flex-1 py-2 text-xs rounded-xl bg-white/50 border border-white/40 text-sky-600 font-medium shadow transition active:scale-95 active:bg-sky-50"
          onClick={() => {
            setIsOpen(true);
            setModalTipo("FINALIZAR");
          }}
        >
          FINALIZAR
        </button>

      </div>

      {/* ===================== BOTONES FLOTANTES ===================== */}
      <button
      className="
      fixed bottom-24 right-5
      w-12 h-12
      flex items-center justify-center
      rounded-full
      bg-white/40 backdrop-blur-xl
      border border-white/40
      text-amber-600
      text-xl
      shadow-lg
      active:scale-95
      transition
      "
      onClick={() => {
          setIsOpen(true)
          setModalTipo("NOTAS")
      }}
      >
      📝
      </button>
    </div>
  );
}