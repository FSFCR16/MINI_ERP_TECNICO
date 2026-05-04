// ─────────────────────────────────────────────────────────────
// NOTA: Este hook fue creado durante el plan de refactor pero
// sus responsabilidades quedaron inline en page.jsx porque la
// lógica necesita acceso al estado local (listSemanas, listTecnicos).
//
// Si en el futuro se mueve ese estado a un Context o Zustand store,
// este hook puede activarse pasándole los setters como parámetros.
// Por ahora NO se importa en ningún componente.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { eliminarSemana } from "@/Services/tencicosServices.js";

export function useHistorialActions({
  listSemanas,
  setListSemanas,
  setListFiltrada,
  setLoading,
  setError,
  openModal,
  closeModal,
}) {
  const [accionPendiente, setAccionPendiente] = useState(null);

  // ─────────────────────────────
  // Eliminar semana
  // ─────────────────────────────
  const handleEliminarSemana = async (semana_id) => {
    try {
      closeModal();
      setLoading(true);

      await eliminarSemana(semana_id);

      const nuevasSemanas = listSemanas.filter((s) => s.id !== semana_id);

      setListSemanas(nuevasSemanas);
      setListFiltrada(nuevasSemanas);
    } catch (err) {
      console.error(err);
      setError("Error eliminando semana");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // Abrir modal con acción pendiente
  // ─────────────────────────────
  const abrirModalEliminar = (tipo, accion) => {
    setAccionPendiente(() => accion);
    openModal(tipo);
  };

  return {
    accionPendiente,
    abrirModalEliminar,
    handleEliminarSemana,
  };
}
