"use client";
import { useCallback } from "react";
import {
  useEsSeleccionada,
  useSeleccionStore,
} from "@/app/stores/useClipboardStore";

/**
 * useMobileClipboard
 *
 * Maneja la selección de registros para copiar en mobile.
 * Bypasea la guardia isDragging de useDragSelect (que es solo desktop/mouse)
 * y calcula el rango directamente sobre el store de Zustand.
 *
 * @param {string|number} rowId       - id_registro ?? id del registro actual
 * @param {Array}         listRegistro - lista completa de registros (para calcular rango)
 * @param {Function}      iniciarDrag  - del hook useDragSelect, para la primera selección
 */
export function useMobileClipboard({ rowId, listRegistro, iniciarDrag }) {
  // Selector estable — solo re-renderiza esta card cuando SU boolean cambia
  const enSeleccion = useEsSeleccionada(rowId);

  const handleCopiarBtn = useCallback(
    (e) => {
      e.stopPropagation();
      const seleccionActual = useSeleccionStore.getState().seleccion;

      if (seleccionActual.size === 0) {
        // Primera selección — delegar a iniciarDrag con el ID real
        iniciarDrag?.(rowId);
        return;
      }

      // Ya hay selección — calcular rango en mobile sin depender de isDragging
      const ids = listRegistro.map((r) => r.id_registro ?? r.id);
      const primerId = [...seleccionActual][0];
      const iA = ids.indexOf(primerId);
      const iB = ids.indexOf(rowId);

      if (iA === -1 || iB === -1) {
        // ID no encontrado en la lista — toggle simple
        const next = new Set(seleccionActual);
        next.has(rowId) ? next.delete(rowId) : next.add(rowId);
        useSeleccionStore.setState({ seleccion: next });
        return;
      }

      // Rango desde el anchor hasta este registro
      const [from, to] = iA <= iB ? [iA, iB] : [iB, iA];
      const rango = new Set(ids.slice(from, to + 1));
      useSeleccionStore.setState({ seleccion: rango });
    },
    [rowId, listRegistro, iniciarDrag],
  );

  return { enSeleccion, handleCopiarBtn };
}
