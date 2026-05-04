"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx";
import { useModalState } from "../tecnico/[nombre]/[semana]/hooks/useModalState.js";
import { ModalManager } from "../tecnico/components_modal/ModalManager.jsx";
import {
  traerTecnicosSemana,
  eliminarSemana,
  eliminarTecnicoSemana,
  getRegistrosPrevios,
  exportarExcelDBPost,
} from "../../Services/tencicosServices.js";
import { formatearFechaSemana } from "@/Utils/api.js";

import { useHistorialSemanas } from "./hooks/useHistorialSemanas.js";
import { useModalAgregarTecnico } from "./hooks/useModalAgregarTecnico.js";

import { HistorialHeader } from "./components/HistorialHeader.jsx";
import { HistorialSearchBar } from "./components/HistorialSearchBar.jsx";
import { SemanaCard } from "./components/SemanaCard.jsx";
import { TecnicoCard } from "./components/TecnicoCard.jsx";
import { HistorialEmptyState } from "./components/HistorialEmptyState.jsx";
import { ModalAgregarTecnico } from "./modals/ModalAgregarTecnico.jsx";

import { filtrarHistorial } from "./utils/historialFilters";

export default function Page() {
  const router = useRouter();
  const { modal, openModal, closeModal } = useModalState();

  const {
    loading,
    error,
    listSemanas,
    setListSemanas,
    vistaSemanas,
    setVistaSemanas,
    busqueda,
    setBusqueda,
  } = useHistorialSemanas();

  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [listTecnicos, setListTecnicos] = useState([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(null);
  const [accionPendiente, setAccionPendiente] = useState(null);

  const {
    modalAgregar,
    tecnicos,
    busquedaTecnico,
    setBusquedaTecnico,
    indexResaltado,
    setIndexResaltado,
    itemsRef,
    abrirModalAgregar,
    cerrarModalAgregar,
    confirmarAgregarTecnico,
    manejarTecladoModal,
    setSemanalocal,
  } = useModalAgregarTecnico();

  const totalSemana = useMemo(
    () => listTecnicos.reduce((acc, t) => acc + (t.total || 0), 0),
    [listTecnicos]
  );

  const listFiltrada = useMemo(() => {
    const base = vistaSemanas ? listSemanas : listTecnicos;
    return filtrarHistorial(base, busqueda, vistaSemanas);
  }, [vistaSemanas, listSemanas, listTecnicos, busqueda]);

  // ── Cargar técnicos de una semana ──────────────────────────
  const cargarTecnicosSemana = async (semana) => {
    setLoadingDetalle(true);
    try {
      const datos = await traerTecnicosSemana(semana.id);
      setListTecnicos(datos || []);
      setSemanaSeleccionada(semana);
      setSemanalocal(semana); // sincroniza el hook del modal
      setVistaSemanas(false);
      setBusqueda("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const volverSemanas = () => {
    setVistaSemanas(true);
    setBusqueda("");
  };

  // ── Eliminar semana ────────────────────────────────────────
  const handleEliminarSemana = async (semana_id) => {
    try {
      closeModal();
      setLoadingDetalle(true);
      await eliminarSemana(semana_id);
      setListSemanas((prev) => prev.filter((s) => s.id !== semana_id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Eliminar técnico de la semana ──────────────────────────
  const handleEliminarTecnico = async (nombre) => {
    try {
      closeModal();
      setLoadingDetalle(true);
      await eliminarTecnicoSemana(nombre, semanaSeleccionada.id);
      setListTecnicos((prev) => prev.filter((t) => t.nombre !== nombre));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Exportar Excel ─────────────────────────────────────────
  const handleExportarExcel = async (tecnico) => {
    try {
      setLoadingDetalle(true);
      const registros = await getRegistrosPrevios(tecnico.nombre, tecnico.semana);

      if (!registros?.length) {
        openModal("SIN_REGISTROS");
        return;
      }

      const registrosParaExportar = registros.map((r) => ({
        id: String(r.id),
        id_registro: r.id,
        id_tecnico: r.tecnico_id,
        nombre: r.nombre,
        job: r.job ?? "",
        job_name: r.job_name ?? "",
        valor_servicio: r.valor_servicio ?? 0,
        porcentaje_tecnico: r.porcentaje_tecnico ?? 0,
        minimo: 0,
        opciones_pago: [],
        tipo_pago: r.tipo_pago ?? "CASH",
        valor_tarjeta: r.valor_tarjeta ?? 0,
        valor_efectivo: r.valor_efectivo ?? 0,
        porcentaje_cc: r.porcentaje_cc ?? 0,
        partes_gil: r.partes_gil ?? 0,
        partes_tecnico: r.partes_tecnico ?? 0,
        tech: r.tech ?? 0,
        subtotal: r.subtotal ?? 0,
        total: r.total ?? 0,
        adicional_dolar: 0,
        notas: [],
      }));

      const response = await exportarExcelDBPost(
        registrosParaExportar,
        tecnico.nombre,
        tecnico.semana
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TECNICO_${tecnico.nombre}_${formatearFechaSemana(tecnico.fecha_inicio)}_${formatearFechaSemana(tecnico.fecha_fin)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Modal eliminar genérico ────────────────────────────────
  const abrirModalEliminar = (tipo, accion) => {
    setAccionPendiente(() => accion);
    openModal(tipo);
  };

  if (error) {
    return (
      <div className="w-full flex justify-center mt-20">
        <div className="bg-white/60 backdrop-blur-xl border border-red-200/50 rounded-2xl px-8 py-10 text-center max-w-sm">
          <p className="text-rose-500 font-medium text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {(loading || loadingDetalle) && <LoadingOverlay />}

      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-200 flex justify-center px-4 py-8">
        <div className="w-full max-w-3xl flex flex-col gap-4">

          {/* ── Header ── */}
          <HistorialHeader
            vistaSemanas={vistaSemanas}
            semanaSeleccionada={semanaSeleccionada}
            totalSemana={totalSemana}
            count={listFiltrada.length}
            onVolver={volverSemanas}
            onInicio={() => router.push("/")}
            // FIX: pasa semanaSeleccionada al abrir el modal
            onAgregar={() => abrirModalAgregar(semanaSeleccionada)}
          />

          {/* ── Buscador ── */}
          <HistorialSearchBar
            value={busqueda}
            onChange={setBusqueda}
            placeholder={vistaSemanas ? "Buscar semana..." : "Buscar técnico..."}
          />

          {/* ── Estado vacío ── */}
          {listFiltrada.length === 0 && !loading && !loadingDetalle && (
            <HistorialEmptyState
              mensaje={
                vistaSemanas
                  ? "No se encontraron semanas"
                  : "No se encontraron técnicos para esta semana"
              }
            />
          )}

          {/* ── Lista semanas ── */}
          {vistaSemanas && (
            <div className="flex flex-col gap-3">
              {listFiltrada.map((semana) => (
                <SemanaCard
                  key={semana.id}
                  semana={semana}
                  onVer={() => cargarTecnicosSemana(semana)}
                  onEliminar={() =>
                    abrirModalEliminar("ELIMINAR_SEMANA", () =>
                      handleEliminarSemana(semana.id)
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* ── Lista técnicos ── */}
          {!vistaSemanas && (
            <div className="flex flex-col gap-3">
              {listFiltrada.map((cart) => (
                <TecnicoCard
                  key={cart.id}
                  tecnico={cart}
                  onVer={() => router.push(`/tecnico/${cart.nombre}/${cart.semana}`)}
                  onExportar={() => handleExportarExcel(cart)}
                  onEliminar={() =>
                    abrirModalEliminar("ELIMINAR_TECNICO", () =>
                      handleEliminarTecnico(cart.nombre)
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <ModalManager
        modal={modal}
        closeModal={closeModal}
        openModal={openModal}
        finalizarTabla={accionPendiente}
        exportarExcelDB={accionPendiente}
        setError={() => {}}
        setLoading={() => {}}
        nombre=""
      />

      <ModalAgregarTecnico
        isOpen={modalAgregar}
        onClose={cerrarModalAgregar}
        tecnicos={tecnicos}
        busquedaTecnico={busquedaTecnico}
        setBusquedaTecnico={setBusquedaTecnico}
        indexResaltado={indexResaltado}
        setIndexResaltado={setIndexResaltado}
        itemsRef={itemsRef}
        onConfirmar={confirmarAgregarTecnico}
        onKeyDown={manejarTecladoModal}
      />
    </>
  );
}