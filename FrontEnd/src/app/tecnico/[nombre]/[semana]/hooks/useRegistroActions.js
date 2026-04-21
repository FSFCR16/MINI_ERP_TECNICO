// useRegistroActions.js
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  envioTablaDB,
  getRegistrosPrevios,
  eliminarRegistrosDb,
  exportarExcelDBPost,
  updateRegistro,
  validarJobDuplicado,
  bulkUpdateRegistros,
} from "../../../../../Services/tencicosServices.js";
import {
  procesarDatosTecnico,
  procesarData,
  formatearNumero,
  mapearErroresZod,
  actualizarPorcentajeCC,
  formatearFechaSemana,
} from "../../../../../Utils/api.js";
import { tecnicoSchema } from "@/app/schemas/tecnicoSchema.js";
import { columnasBase } from "../tableRow/columnasBase.jsx";
import { useRevertible } from "../../../../../app/hooks/useRevertible.js";
import { useDragSelect } from "@/app/hooks/useDragSelect.js";
import { useClipboardActions } from "@/app/hooks/useClipboardActions.js";

export function useRegistroActions({
  nombre,
  semana,
  idTecnico, // ← nuevo param requerido para clipboard
  data,
  rowData,
  setRow,
  listRegistro,
  setListRegistros,
  setLoading,
  setError,
  setNotas,
  openModal,
  openError,
  closeModal,
  semanaFechas,
}) {
  const [elementosAEliminar, setElementosAEliminar] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const confirmacionRef = useRef(null);

  const openModalRef = useRef(openModal);
  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  const listRegistroRef = useRef(listRegistro);
  useEffect(() => {
    listRegistroRef.current = listRegistro;
  }, [listRegistro]);

  const {
    haycambiosPendientes,
    marcarCambio,
    revertirCambios,
    confirmarGuardado,
    getIdsModificados,
  } = useRevertible(listRegistroRef, setListRegistros);

  const buildColumns = (rowDataParam = {}, tipoTabla) =>
    columnasBase
      .map((col) => ({
        ...col,
        visible:
          !col.hideOn?.includes(tipoTabla) &&
          !col.disableOnPago?.includes(rowDataParam.tipo_pago),
        disabled: !col.disableOn?.includes(tipoTabla),
      }))
      .filter((c) => c.visible);

  const columnasTablaEditable = useMemo(
    () => buildColumns(rowData ?? {}, "editable"),
    [rowData?.tipo_pago], // ← ?. aquí también
  );
  const columnasTablaGeneral = useMemo(() => buildColumns({}, "general"), []);

  const toggleSeleccion = useCallback((dataEliminar) => {
    setElementosAEliminar((prev) =>
      prev.includes(dataEliminar)
        ? prev.filter((e) => e !== dataEliminar)
        : [...prev, dataEliminar],
    );
  }, []);

  const toggleSeleccionTodos = () => {
    setElementosAEliminar(
      elementosAEliminar.length === listRegistro.length
        ? []
        : [...listRegistro],
    );
  };

  const handleBtnAgregar = async () => {
    const rowLimpio = { ...rowData };

    const camposNumericos = [
      "valor_servicio",
      "valor_tarjeta",
      "valor_efectivo",
      "partes_gil",
      "partes_tecnico",
      "tech",
      "porcentaje_cc",
      "porcentaje_tecnico",
      "adicional_dolar",
      "subtotal",
      "total",
    ];
    camposNumericos.forEach((campo) => {
      if (rowLimpio[campo] === "" || rowLimpio[campo] == null) {
        rowLimpio[campo] = 0;
      }
    });

    if (rowLimpio.tipo_pago?.toLowerCase() !== "mixto") {
      rowLimpio.valor_tarjeta = 0;
      rowLimpio.valor_efectivo = 0;
    }

    const rowCopy = procesarData(rowLimpio);
    rowCopy.id = crypto.randomUUID();

    const resultado = tecnicoSchema.safeParse(rowCopy);
    if (!resultado.success) {
      openError(mapearErroresZod(resultado.error));
      return;
    }

    if (rowCopy.job_name) {
      try {
        const { existe, tecnico } = await validarJobDuplicado(rowCopy.job_name);
        if (existe) {
          const confirmo = await new Promise((resolve) => {
            confirmacionRef.current = resolve;
            openModal("JOB_DUPLICADO", tecnico);
          });
          if (!confirmo) return;
        }
      } catch (err) {
        console.error("Error validando job duplicado:", err);
      }
    }

    setListRegistros((prev) => [rowCopy, ...prev]);
    setRow(procesarDatosTecnico(data[0]));

    try {
      const res = await envioTablaDB([rowCopy], semana);
      const idReal = res?.registros?.[0]?.id;

      if (idReal) {
        setListRegistros((prev) =>
          prev.map((r) =>
            r.id === rowCopy.id ? { ...r, id_registro: idReal } : r,
          ),
        );
      }
    } catch (err) {
      console.error("Error guardando:", err);
      setListRegistros((prev) => prev.filter((r) => r.id !== rowCopy.id));
      openModal("ERROR_GUARDADO");
    }
  };

  const eliminarSeleccionados = async () => {
    setListRegistros(
      listRegistro.filter((d) => !elementosAEliminar.includes(d)),
    );
    await eliminarRegistrosDb(elementosAEliminar.filter((d) => d.id_registro));
    setElementosAEliminar([]);
  };

  const finalizarTabla = async () => {
    closeModal();
    setLoading(true);
    try {
      const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(
        () => [],
      );
      const dataPreviaProcesada = registrosPrevios.flatMap((dato) => {
        const tecnicoMatch = data.find(
          (t) => t.job.replace(/\s+/g, "") === dato.job.replace(/\s+/g, ""),
        );
        if (!tecnicoMatch) return [];
        return procesarDatosTecnico([tecnicoMatch], dato);
      });
      setListRegistros(dataPreviaProcesada);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const clickExportExcel = () => {
    if (listRegistro.length === 0) {
      openModal("SIN_REGISTROS");
      return;
    }
    openModal("EXPORTAR");
  };

  const exportarExcelDB = async () => {
    try {
      closeModal();
      setLoading(true);
      const registrosGuardados = listRegistro.filter((e) => e.id_registro);
      if (!registrosGuardados.length) {
        openModal("SIN_REGISTROS");
        return;
      }
      const response = await exportarExcelDBPost(
        registrosGuardados,
        nombre,
        semana,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tecnico_${nombre}_${semanaFechas.inicio}_${semanaFechas.fin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error exportando:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarCeldaRegistro = useCallback(
    (id_registro, colKey, nuevoValor) => {
      marcarCambio(id_registro);
      setListRegistros((prev) => {
        const copia = [...prev];
        const realIndex = copia.findIndex((r) => r.id_registro === id_registro);
        if (realIndex === -1) return prev;

        const filaActual = copia[realIndex];
        let filaActualizada = { ...filaActual, [colKey]: nuevoValor };

        if (colKey === "tipo_pago" && nuevoValor.toLowerCase() !== "mixto") {
          filaActualizada.valor_tarjeta = 0;
          filaActualizada.valor_efectivo = 0;
        }

        if (
          (colKey === "valor_tarjeta" || colKey === "valor_efectivo") &&
          filaActualizada.tipo_pago?.toLowerCase() !== "mixto"
        ) {
          filaActualizada[colKey] = 0;
        }

        if (colKey === "porcentaje_cc") {
          filaActualizada.porcentaje_cc_base = null;
        }

        if (colKey === "tipo_pago") {
          const nuevoTipo = nuevoValor.toLowerCase();
          if (nuevoTipo === "cc" || nuevoTipo === "mixto") {
            if (
              !filaActualizada.porcentaje_cc &&
              filaActualizada.porcentaje_cc_original
            ) {
              filaActualizada.porcentaje_cc = formatearNumero(
                filaActualizada.valor_servicio *
                  (filaActualizada.porcentaje_cc_original / 100),
              );
              filaActualizada.porcentaje_cc_base =
                filaActualizada.porcentaje_cc_original;
            }
          }
          if (nuevoTipo === "cash") {
            filaActualizada.porcentaje_cc = 0;
            filaActualizada.porcentaje_cc_base =
              filaActualizada.porcentaje_cc_original;
          }
        }

        const camposQueRecalculan = [
          "valor_servicio",
          "valor_efectivo",
          "valor_tarjeta",
          "partes_gil",
          "partes_tecnico",
          "tech",
          "tipo_pago",
          "aplica_dolar_empresa",
          "adicional_dolar",
          "porcentaje_tecnico",
          "porcentaje_cc",
          "is_cash",
        ];

        const filaFinal = camposQueRecalculan.includes(colKey)
          ? procesarData({ ...filaActualizada })
          : filaActualizada;

        copia[realIndex] = filaFinal;
        return copia;
      });
    },
    [marcarCambio, setListRegistros],
  );

  const guardarCambios = useCallback(async () => {
    if (!haycambiosPendientes) return;
    const ids = getIdsModificados();
    const registrosConId = listRegistroRef.current.filter(
      (r) => r.id_registro && ids.has(r.id_registro),
    );
    if (!registrosConId.length) return;

    setGuardando(true);
    try {
      const payload = registrosConId.map((r) => ({ ...r, id: r.id_registro }));
      await bulkUpdateRegistros(payload);
      confirmarGuardado();
    } catch (err) {
      console.error("Error guardando:", err);
      openModalRef.current("ERROR_GUARDADO");
    } finally {
      setGuardando(false);
    }
  }, [confirmarGuardado, haycambiosPendientes, getIdsModificados]);

  const procesarMensaje = (result) => {
    try {
      setRow((prev) => {
        let newRow = { ...prev };
        let found;

        if (result.job_name) newRow.job_name = result.job_name.toUpperCase();

        if (data[0].job !== "TODO") {
          if (result.job_type) {
            const jobClean = result.job_type.replace(/\s+/g, "");
            if (["LOCKOUT", "CARKEY"].includes(jobClean)) {
              newRow.job = result.job_type.toUpperCase();
            }
            found = data.find((d) => d.job.replace(/\s+/g, "") === jobClean);
          }
        }

        if (result.valor_servicio)
          newRow.valor_servicio = result.valor_servicio;
        if (result.valor_efectivo)
          newRow.valor_efectivo = result.valor_efectivo;
        if (result.valor_tarjeta) newRow.valor_tarjeta = result.valor_tarjeta;
        if (result.parts_tecnico) newRow.partes_tecnico = result.parts_tecnico;
        if (result.parts_gil) newRow.partes_gil = result.parts_gil;
        if (result.tipo_pago) newRow.tipo_pago = result.tipo_pago.toUpperCase();

        if (data.length > 1 && found) {
          return actualizarPorcentajeCC(
            procesarDatosTecnico([found], newRow, true)[0],
          );
        }
        return actualizarPorcentajeCC(
          procesarDatosTecnico(data, newRow, true)[0],
        );
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo interpretar el mensaje");
    }
  };

  // ── Drag select (highlight amarillo) ──────────────────────
  const {
    seleccionCopiable,
    iniciarDrag,
    extenderDrag,
    limpiarSeleccion,
    scrollRef,
  } = useDragSelect(listRegistro);

  // ── Clipboard (Ctrl+C, Ctrl+V, pegar) ────────────────────
  const { copiar, pegar, clipboardRegistros, hayClipboard } =
    useClipboardActions({
      listaVisible: listRegistro,
      seleccionCopiable,
      limpiarSeleccion,
      semana,
      idTecnico,
      nombre,
      setListRegistros,
    });

  return {
    elementosAEliminar,
    toggleSeleccion,
    toggleSeleccionTodos,
    columnasTablaEditable,
    columnasTablaGeneral,
    handleBtnAgregar,
    eliminarSeleccionados,
    finalizarTabla,
    clickExportExcel,
    exportarExcelDB,
    actualizarCeldaRegistro,
    procesarMensaje,
    guardarCambios,
    revertirCambios,
    haycambiosPendientes,
    guardando,
    confirmacionRef,
    // ── clipboard ──
    seleccionCopiable,
    iniciarDrag,
    extenderDrag,
    copiar,
    pegar,
    hayClipboard,
    clipboardRegistros,
    scrollRef,
  };
}
