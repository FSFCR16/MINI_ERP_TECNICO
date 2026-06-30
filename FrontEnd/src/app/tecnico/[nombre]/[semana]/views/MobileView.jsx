"use client";
import { useState, useMemo } from "react";
import { ordenarRegistros } from "@/Utils/api.js";
import { useSeleccionStore } from "@/app/stores/useClipboardStore";
import { MobileHeader } from "./Movil/MobileHeader";
import { MobileFormulario } from "./Movil/MobileFormulario";
import { MobileListaHeader } from "./Movil/MobileListaHeader";
import { MobileCard } from "./Movil/MobileCard";
import { MobileBarraInferior } from "./Movil/MobileBarraInferior";
import { MobileFAB } from "./Movil/MobileFAB";
import { useClipboardRegistros } from "@/app/stores/useClipboardStore";

export function MobileView({
  rowData,
  setRow,
  columnasTablaEditable = [],
  columnasTablaGeneral = [],
  columnasDeshabilitdasGenerales = [],
  data = [],
  moverseEntreCeldas,
  handleBtnAgregar,
  listRegistro = [],
  toggleSeleccion,
  toggleSeleccionTodos,
  elementosAEliminar = [],
  eliminarSeleccionados,
  openModal,
  tieneError,
  baseRef,
  setNotas,
  isMobile,
  semanaFechas,
  nombre,
  actualizarCeldaRegistro,
  guardarCambios,
  revertirCambios,
  haycambiosPendientes,
  guardando,
  iniciarDrag,
  copiar,
  pegar,
}) {
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [registrosFiltrados, setRegistrosFiltrados] = useState(null);
  const [orden, setOrden] = useState("recientes"); // "recientes" | "antiguos" | "id"

  const seleccionSize = useSeleccionStore(s => s.seleccion.size);
  const clipboardRegistros = useClipboardRegistros();
  const hayClipboard = clipboardRegistros?.length > 0;

  const listaVisible = registrosFiltrados
    ? listRegistro.filter(r => registrosFiltrados.has(r.id_registro))
    : listRegistro;

  const listaOrdenada = useMemo(() => ordenarRegistros(listaVisible, orden), [listaVisible, orden]);

  const toggleExpandido = (index) => {
    setExpandido(prev => {
      if (prev === index) { setEditando(null); return null; }
      return index;
    });
  };

  const toggleEditar = (e, index) => {
    e.stopPropagation();
    setEditando(prev => prev === index ? null : index);
    setExpandido(index);
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 p-4 flex flex-col gap-4"
      style={{ paddingBottom: "100px" }}
    >
      <MobileHeader nombre={nombre} semanaFechas={semanaFechas} openModal={openModal} />

      <MobileFormulario
        columnasTablaEditable={columnasTablaEditable}
        columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
        rowData={rowData}
        setRow={setRow}
        data={data}
        tieneError={tieneError}
        moverseEntreCeldas={moverseEntreCeldas}
        baseRef={baseRef}
        setNotas={setNotas}
        isMobile={isMobile}
        handleBtnAgregar={handleBtnAgregar}
      />

      {(listRegistro.length > 0 || hayClipboard) && (
        <MobileListaHeader
          listRegistro={listRegistro}
          listaVisible={listaVisible}
          elementosAEliminar={elementosAEliminar}
          toggleSeleccionTodos={toggleSeleccionTodos}
          eliminarSeleccionados={eliminarSeleccionados}
          setRegistrosFiltrados={setRegistrosFiltrados}
          seleccionSize={seleccionSize}
          copiar={copiar}
          pegar={pegar}
        />
      )}

      {listRegistro.length > 1 && (
        <div className="inline-flex bg-white/60 dark:bg-slate-800/60 rounded-xl p-0.5 border border-white/50 dark:border-slate-700/60 w-fit">
          {[["recientes", "Recientes"], ["antiguos", "Antiguos"], ["id", "Por ID"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setOrden(k)}
              className={`px-3 py-1 text-[11px] rounded-lg font-medium transition cursor-pointer ${orden === k ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 dark:text-slate-300"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {listaVisible.length === 0 && listRegistro.length > 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
            Sin resultados para esa búsqueda
          </p>
        )}

        {listaOrdenada.map((row, index) => (
          <MobileCard
            key={row.id_registro ?? index}
            row={row}
            index={index}
            abierto={expandido === index}
            modoEdicion={editando === index}
            seleccionado={elementosAEliminar.includes(row)}
            columnasTablaGeneral={columnasTablaGeneral}
            columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
            toggleExpandido={toggleExpandido}
            toggleEditar={toggleEditar}
            toggleSeleccion={toggleSeleccion}
            actualizarCeldaRegistro={actualizarCeldaRegistro}
            setNotas={setNotas}
            data={data}
            iniciarDrag={iniciarDrag}
            listRegistro={listRegistro}
          />
        ))}
      </div>

      <MobileBarraInferior
        haycambiosPendientes={haycambiosPendientes}
        guardando={guardando}
        guardarCambios={guardarCambios}
        revertirCambios={revertirCambios}
        openModal={openModal}
      />

      <MobileFAB openModal={openModal} />
    </div>
  );
}