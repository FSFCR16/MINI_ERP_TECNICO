#!/bin/bash
# scaffold_mobile.sh
# Ejecutar desde la raíz del proyecto Next.js
# Crea la estructura modularizada de la vista Mobile
# Usage: bash scaffold_mobile.sh

set -e

BASE="C:\Users\INTEL\MINI_ERP_TECNICO\FrontEnd\src\app\tecnico\[nombre]\[semana]\views\Movil"

echo "📁 Creando carpeta $BASE..."
mkdir -p "$BASE"

# ─────────────────────────────────────────────
# 1. MobileHeader.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileHeader.jsx" << 'EOF'
"use client";
import Link from "next/link";

export function MobileHeader({ nombre, semanaFechas, openModal }) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-sm px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-700">{nombre}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {semanaFechas.inicio} — {semanaFechas.fin} · {new Date().getFullYear()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-slate-500 shadow-sm active:scale-95 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-amber-600 shadow-sm active:scale-95 transition"
          onClick={() => openModal("HISTORIAL")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 2. MobileFormulario.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileFormulario.jsx" << 'EOF'
"use client";
import { CellRenderer } from "../../tableRow/renderCell";

export function MobileFormulario({
  columnasTablaEditable,
  columnasDeshabilitdasGenerales,
  rowData,
  setRow,
  data,
  tieneError,
  moverseEntreCeldas,
  baseRef,
  setNotas,
  isMobile,
  handleBtnAgregar,
}) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white/40 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 text-sm">Nuevo registro</h2>
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-sky-100/80 text-sky-600 border border-sky-200/60">
          Semana activa
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {columnasTablaEditable.map((col, index) => (
          <div
            key={col.key}
            className={`flex flex-col gap-1 ${col.fullWidth ? "col-span-2" : ""}`}
          >
            <label className="text-[11px] text-slate-500 font-medium pl-1">
              {col.label}
            </label>
            <div className="bg-white/50 border border-white/60 rounded-xl overflow-hidden">
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
                setNotas={setNotas}
                isMobile={isMobile}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleBtnAgregar}
          className="w-full py-2.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 text-sky-600 text-sm font-semibold shadow-sm active:scale-[0.98] transition-all duration-150"
        >
          + Agregar registro
        </button>
      </div>
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 3. MobileListaHeader.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileListaHeader.jsx" << 'EOF'
"use client";
import { BuscadorRegistros } from "../../components/BuscadorRegistros";

export function MobileListaHeader({
  listRegistro,
  listaVisible,
  elementosAEliminar,
  toggleSeleccionTodos,
  eliminarSeleccionados,
  setRegistrosFiltrados,
  // fase 2 — clipboard
  copiar,
  pegar,
  hayClipboard,
  seleccionCopiable,
}) {
  const haySeleccion = seleccionCopiable && seleccionCopiable.size > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* conteo y acciones */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-600">
            {listaVisible.length} / {listRegistro.length} registro
            {listRegistro.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={toggleSeleccionTodos}
            className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/60 border border-white/50 active:scale-95 transition"
          >
            {elementosAEliminar.length === listRegistro.length
              ? "Deseleccionar"
              : "Todos"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Clipboard: copiar */}
          {haySeleccion && (
            <button
              onClick={copiar}
              className="text-xs text-indigo-500 font-medium px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-100 active:scale-95 transition"
            >
              Copiar {seleccionCopiable.size}
            </button>
          )}
          {/* Clipboard: pegar */}
          {hayClipboard && (
            <button
              onClick={pegar}
              className="text-xs text-sky-500 font-medium px-3 py-1 rounded-full bg-sky-50/80 border border-sky-100 active:scale-95 transition"
            >
              Pegar
            </button>
          )}
          {/* Eliminar */}
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

      {/* buscador */}
      <BuscadorRegistros
        registros={listRegistro}
        onFiltrar={setRegistrosFiltrados}
      />
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 4. MobileCardTotales.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileCardTotales.jsx" << 'EOF'
"use client";

export function MobileCardTotales({ row }) {
  const totalNegativo = Number(row.total) < 0;

  return (
    <div className="mx-4 mb-3 mt-1 flex gap-2">
      <div className="flex-1 bg-indigo-50/60 border border-indigo-100/60 rounded-2xl p-2.5 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Servicio</p>
        <p className="text-sm font-bold text-indigo-600">${row.valor_servicio ?? "—"}</p>
      </div>
      <div
        className={`flex-1 border rounded-2xl p-2.5 text-center ${
          totalNegativo
            ? "bg-rose-50/60 border-rose-100/60"
            : "bg-slate-50/60 border-slate-100/60"
        }`}
      >
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
        <p
          className={`text-sm font-bold ${
            totalNegativo ? "text-rose-500" : "text-slate-800"
          }`}
        >
          ${row.total ?? "—"}
        </p>
      </div>
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 5. MobileCardDetail.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileCardDetail.jsx" << 'EOF'
"use client";

export function MobileCardDetail({ row, columnasTablaGeneral }) {
  return (
    <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {columnasTablaGeneral
        .filter(
          (col) =>
            col.key !== "check_box" &&
            col.key !== "valor_servicio" &&
            col.key !== "total"
        )
        .map((col) => (
          <div key={col.key} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
              {col.label}
            </span>
            <span className="text-xs font-semibold text-slate-700 break-words">
              {row[col.key] ?? "—"}
            </span>
          </div>
        ))}
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 6. MobileCardEdit.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileCardEdit.jsx" << 'EOF'
"use client";
import { CellRenderer } from "../../tableRow/renderCell";

export function MobileCardEdit({
  row,
  indexReal,
  columnasTablaGeneral,
  columnasDeshabilitdasGenerales,
  actualizarCeldaRegistro,
  setNotas,
  data,
}) {
  return (
    <div className="px-4 py-3 grid grid-cols-2 gap-3">
      {columnasTablaGeneral
        .filter((col) => col.key !== "check_box" && col.key !== "total")
        .map((col) => (
          <div key={col.key} className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide pl-1">
              {col.label}
            </label>
            {col.editable ? (
              <div className="bg-white/70 border border-sky-200/60 rounded-xl overflow-hidden shadow-sm">
                <CellRenderer
                  col={col}
                  index={0}
                  rowData={row}
                  setRow={(valOrFn) => {
                    const next =
                      typeof valOrFn === "function" ? valOrFn(row) : valOrFn;
                    Object.keys(next).forEach((k) => {
                      if (next[k] !== row[k]) {
                        actualizarCeldaRegistro(indexReal, k, next[k]);
                      }
                    });
                  }}
                  data={data}
                  tieneError={() => false}
                  setCellRef={() => {}}
                  moverseEntreCeldas={() => {}}
                  columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                  setNotas={setNotas}
                  isMobile={true}
                />
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-500 px-1">
                {row[col.key] ?? "—"}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 7. MobileCard.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileCard.jsx" << 'EOF'
"use client";
import { memo } from "react";
import { MobileCardDetail } from "./MobileCardDetail";
import { MobileCardEdit } from "./MobileCardEdit";
import { MobileCardTotales } from "./MobileCardTotales";

export const MobileCard = memo(function MobileCard({
  row,
  index,
  indexReal,
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
  // fase 2 — long press para selección clipboard
  onLongPress,
  enModoClipboard,
}) {
  const totalNegativo = Number(row.total) < 0;

  return (
    <div
      className={`bg-white/60 backdrop-blur-2xl border rounded-3xl shadow-md overflow-hidden transition-all duration-300 ${
        seleccionado
          ? "border-indigo-300/60 bg-indigo-50/40"
          : modoEdicion
          ? "border-sky-300/60 bg-sky-50/20"
          : "border-white/50"
      }`}
    >
      {/* CABECERA */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-white/40 transition"
        onClick={() => toggleExpandido(index)}
        onContextMenu={(e) => { e.preventDefault(); onLongPress?.(row); }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={() => toggleSeleccion(row)}
            className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
          />
        </div>

        <span className="text-[11px] font-bold text-slate-400 min-w-[20px]">
          #{index + 1}
        </span>

        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-700 truncate">
            {row.nombre ?? row.tipo_pago ?? "—"}
          </span>
          <span className="text-[11px] text-slate-500 truncate">
            Servicio: ${row.valor_servicio ?? "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${
              totalNegativo ? "text-rose-500" : "text-indigo-600"
            }`}
          >
            ${row.total ?? "—"}
          </span>

          <button
            onClick={(e) => toggleEditar(e, index)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition active:scale-95 ${
              modoEdicion
                ? "bg-sky-500 text-white border-sky-400"
                : "bg-white/60 text-sky-600 border-white/50"
            }`}
          >
            {modoEdicion ? "✓ Listo" : "Editar"}
          </button>

          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
              abierto ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* CONTENIDO EXPANDIDO */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          abierto ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-white/40 mx-4" />

        {modoEdicion ? (
          <MobileCardEdit
            row={row}
            indexReal={indexReal}
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
EOF

# ─────────────────────────────────────────────
# 8. MobileBarraInferior.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileBarraInferior.jsx" << 'EOF'
"use client";

export function MobileBarraInferior({
  haycambiosPendientes,
  guardando,
  guardarCambios,
  revertirCambios,
  openModal,
}) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/70 backdrop-blur-2xl border-t border-white/50 px-4 py-3 flex gap-2 z-40">
      {haycambiosPendientes && (
        <>
          <button
            onClick={() => revertirCambios(false)}
            disabled={guardando}
            className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-rose-500 font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
          >
            Revertir
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex-1 py-2 text-xs rounded-2xl font-semibold shadow-sm active:scale-95 transition disabled:opacity-40"
            style={{
              backgroundColor: guardando ? "#86efac" : "#22c55e",
              color: "white",
            }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </>
      )}
      <button
        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-green-600 font-semibold shadow-sm active:scale-95 transition"
        onClick={() => openModal("EXPORTAR")}
      >
        Exportar
      </button>
      <button
        className="flex-1 py-2 text-xs rounded-2xl bg-white/60 border border-white/50 text-sky-600 font-semibold shadow-sm active:scale-95 transition"
        onClick={() => openModal("FINALIZAR")}
      >
        Finalizar
      </button>
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# 9. MobileFAB.jsx
# ─────────────────────────────────────────────
cat > "$BASE/MobileFAB.jsx" << 'EOF'
"use client";
import { useState } from "react";

export function MobileFAB({ openModal }) {
  const [fabAbierto, setFabAbierto] = useState(false);

  const accion = (tipo) => {
    openModal(tipo);
    setFabAbierto(false);
  };

  return (
    <>
      {fabAbierto && (
        <div className="fixed inset-0 z-40" onClick={() => setFabAbierto(false)} />
      )}

      <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2 z-50">
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-200 ${
            fabAbierto
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 bg-white/80 backdrop-blur-xl border border-white/50 rounded-full px-3 py-1 shadow-sm">
              Mensaje
            </span>
            <button
              onClick={() => accion("AUTO_MESSAGE")}
              className="w-11 h-11 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 text-indigo-600 shadow-md flex items-center justify-center active:scale-95 transition text-lg"
            >
              💬
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 bg-white/80 backdrop-blur-xl border border-white/50 rounded-full px-3 py-1 shadow-sm">
              Notas
            </span>
            <button
              onClick={() => accion("NOTAS")}
              className="w-11 h-11 rounded-full bg-white/70 backdrop-blur-xl border border-white/50 text-amber-500 shadow-md flex items-center justify-center active:scale-95 transition text-lg"
            >
              📝
            </button>
          </div>
        </div>

        <button
          onClick={() => setFabAbierto((prev) => !prev)}
          className={`w-[52px] h-[52px] rounded-full bg-white/70 backdrop-blur-2xl border border-white/60 text-slate-700 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 ${
            fabAbierto ? "rotate-45" : ""
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </>
  );
}
EOF

# ─────────────────────────────────────────────
# 10. MobileView.jsx — orquestador limpio
# ─────────────────────────────────────────────
cat > "$BASE/MobileView.jsx" << 'EOF'
"use client";
import { useState } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobileFormulario } from "./MobileFormulario";
import { MobileListaHeader } from "./MobileListaHeader";
import { MobileCard } from "./MobileCard";
import { MobileBarraInferior } from "./MobileBarraInferior";
import { MobileFAB } from "./MobileFAB";

export function MobileView({
  // state
  rowData, setRow,
  columnasTablaEditable, columnasTablaGeneral,
  columnasDeshabilitdasGenerales,
  data,
  listRegistro,
  elementosAEliminar,
  haycambiosPendientes, guardando,
  tieneError,
  semanaFechas, nombre,
  // handlers
  moverseEntreCeldas, baseRef, setNotas,
  handleBtnAgregar,
  toggleSeleccion, toggleSeleccionTodos,
  eliminarSeleccionados,
  actualizarCeldaRegistro,
  guardarCambios, revertirCambios,
  // clipboard (fase 2)
  copiar, pegar, hayClipboard, seleccionCopiable,
  // modal
  openModal,
  isMobile,
}) {
  const [expandido, setExpandido]               = useState(null);
  const [editando, setEditando]                 = useState(null);
  const [registrosFiltrados, setRegistrosFiltrados] = useState(null);

  const listaVisible = registrosFiltrados
    ? listRegistro.filter((r) => registrosFiltrados.has(r.id_registro))
    : listRegistro;

  const toggleExpandido = (index) => {
    setExpandido((prev) => (prev === index ? null : index));
    if (expandido === index) setEditando(null);
  };

  const toggleEditar = (e, index) => {
    e.stopPropagation();
    setEditando((prev) => (prev === index ? null : index));
    setExpandido(index);
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 p-4 flex flex-col gap-4"
      style={{ paddingBottom: "100px" }}
    >
      <MobileHeader
        nombre={nombre}
        semanaFechas={semanaFechas}
        openModal={openModal}
      />

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

      {listRegistro.length > 0 && (
        <MobileListaHeader
          listRegistro={listRegistro}
          listaVisible={listaVisible}
          elementosAEliminar={elementosAEliminar}
          toggleSeleccionTodos={toggleSeleccionTodos}
          eliminarSeleccionados={eliminarSeleccionados}
          setRegistrosFiltrados={setRegistrosFiltrados}
          copiar={copiar}
          pegar={pegar}
          hayClipboard={hayClipboard}
          seleccionCopiable={seleccionCopiable}
        />
      )}

      <div className="flex flex-col gap-3">
        {listaVisible.length === 0 && listRegistro.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-6">
            Sin resultados para esa búsqueda
          </p>
        )}

        {listaVisible.map((row, index) => {
          const indexReal = listRegistro.indexOf(row);
          return (
            <MobileCard
              key={row.id_registro ?? index}
              row={row}
              index={index}
              indexReal={indexReal}
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
            />
          );
        })}
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
EOF

echo ""
echo "✅ Scaffold completo. Archivos creados en $BASE:"
echo ""
ls -1 "$BASE"
echo ""
echo "⚠️  SIGUIENTE PASO: actualiza page.jsx si el import de MobileView cambió de ruta."
echo "   El import debería seguir siendo: from './views/MobileView.jsx'"
echo "   → pero ahora MobileView.jsx vive en views/Movil/MobileView.jsx"
echo ""
echo "   En page.jsx cambia:"
echo "   import { MobileView } from './views/MobileView.jsx'"
echo "   por:"
echo "   import { MobileView } from './views/Movil/MobileView.jsx'"