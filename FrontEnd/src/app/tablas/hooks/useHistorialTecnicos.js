import { useState } from "react";
import {
  traerTecnicosSemana,
  eliminarTecnicoSemana,
  getRegistrosPrevios,
  exportarExcelDBPost,
} from "@/Services/tencicosServices.js";

import { formatearFechaSemana } from "@/Utils/api.js";

export function useHistorialTecnicos({
  setLoading,
  setError,
  openModal,
  closeModal,
}) {
  const [listTecnicos, setListTecnicos] = useState([]);
  const [listFiltrada, setListFiltrada] = useState([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(null);

  const totalSemana = listTecnicos.reduce((acc, t) => acc + (t.total || 0), 0);

  // ─────────────────────────────
  // Cargar técnicos por semana
  // ─────────────────────────────
  const cargarTecnicosSemana = async (semana) => {
    setLoading(true);
    try {
      const datos = await traerTecnicosSemana(semana.id);

      setListTecnicos(datos || []);
      setListFiltrada(datos || []);
      setSemanaSeleccionada(semana);

      return true;
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de técnicos");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // Eliminar técnico
  // ─────────────────────────────
  const handleEliminarTecnico = async (nombre) => {
    try {
      closeModal();
      setLoading(true);

      await eliminarTecnicoSemana(nombre, semanaSeleccionada.id);

      const nuevaLista = listTecnicos.filter((t) => t.nombre !== nombre);

      setListTecnicos(nuevaLista);
      setListFiltrada(nuevaLista);
    } catch (err) {
      console.error(err);
      setError("Error eliminando registros");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // Exportar Excel
  // ─────────────────────────────
  const handleExportarExcel = async (tecnico) => {
    try {
      setLoading(true);

      const registros = await getRegistrosPrevios(
        tecnico.nombre,
        tecnico.semana,
      );

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
        tecnico.semana,
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
      console.error("Error exportando:", err);
      setError("Error exportando excel");
    } finally {
      setLoading(false);
    }
  };

  return {
    listTecnicos,
    setListTecnicos,
    listFiltrada,
    setListFiltrada,
    semanaSeleccionada,
    setSemanaSeleccionada,
    totalSemana,
    cargarTecnicosSemana,
    handleEliminarTecnico,
    handleExportarExcel,
  };
}
