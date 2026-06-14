// useRegistroActions.js
// Acciones de la tabla del módulo GENERAL. Ahora delega edición/selección/clipboard/
// historial/guardado al MOTOR compartido `useTablaEditable` (mismo que Virginia).
// Mantiene su API de retorno (con alias) para no tocar DesktopView/MobileView/TablaAcciones.
//
// Cambio de comportamiento vs versión previa: pegar y eliminar ahora son DIFERIDOS
// (quedan pendientes hasta Guardar), y el historial es multinivel (Ctrl+Z / Ctrl+Y).
import { useMemo, useEffect, useRef, useCallback } from "react";
import {
  envioTablaDB,
  getRegistrosPrevios,
  eliminarRegistrosDb,
  exportarExcelDBPost,
  validarJobDuplicado,
  bulkUpdateRegistros,
} from "../../../../../Services/tencicosServices.js";
import {
  procesarDatosTecnico,
  procesarData,
  formatearNumero,
  mapearErroresZod,
  actualizarPorcentajeCC,
} from "../../../../../Utils/api.js";
import { tecnicoSchema } from "@/app/schemas/tecnicoSchema.js";
import { columnasBase } from "../tableRow/columnasBase.jsx";
import { useTablaEditable } from "@/app/hooks/useTablaEditable";

// Campos para el diff (qué cambió vs lo guardado) y para disparar recálculo.
const CAMPOS_COMPARAR = ["job", "job_name", "valor_servicio", "tipo_pago", "valor_tarjeta",
  "valor_efectivo", "partes_gil", "partes_tecnico", "tech", "porcentaje_tecnico",
  "porcentaje_cc", "aplica_dolar_empresa", "is_cash", "subtotal", "total"];
const CAMPOS_RECALCULAN = ["valor_servicio", "valor_efectivo", "valor_tarjeta", "partes_gil",
  "partes_tecnico", "tech", "tipo_pago", "aplica_dolar_empresa", "adicional_dolar",
  "porcentaje_tecnico", "porcentaje_cc", "is_cash"];

export function useRegistroActions({
  nombre,
  semana,
  data,
  rowData,
  setRow,
  listRegistro,
  setListRegistros,
  setLoading,
  setError,
  openModal,
  openError,
  closeModal,
  semanaFechas,
}) {
  const confirmacionRef = useRef(null);
  const openModalRef = useRef(openModal);
  useEffect(() => { openModalRef.current = openModal; }, [openModal]);

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
    [rowData?.tipo_pago],
  );
  const columnasTablaGeneral = useMemo(() => buildColumns({}, "general"), []);

  // ── Lógica específica del general que inyecta el motor ──────────────
  const editarCelda = useCallback((filaActual, colKey, nuevoValor) => {
    let fa = { ...filaActual, [colKey]: nuevoValor };

    if (colKey === "tipo_pago" && String(nuevoValor).toLowerCase() !== "mixto") {
      fa.valor_tarjeta = 0;
      fa.valor_efectivo = 0;
    }
    if ((colKey === "valor_tarjeta" || colKey === "valor_efectivo") && fa.tipo_pago?.toLowerCase() !== "mixto") {
      fa[colKey] = 0;
    }
    if (colKey === "porcentaje_cc") fa.porcentaje_cc_base = null;
    if (colKey === "tipo_pago") {
      const t = String(nuevoValor).toLowerCase();
      if (t === "cc" || t === "mixto") {
        if (!fa.porcentaje_cc && fa.porcentaje_cc_original) {
          fa.porcentaje_cc = formatearNumero(fa.valor_servicio * (fa.porcentaje_cc_original / 100));
          fa.porcentaje_cc_base = fa.porcentaje_cc_original;
        }
      }
      if (t === "cash") {
        fa.porcentaje_cc = 0;
        fa.porcentaje_cc_base = fa.porcentaje_cc_original;
      }
    }
    return CAMPOS_RECALCULAN.includes(colKey) ? procesarData({ ...fa }) : fa;
  }, []);

  const prepararPegado = useCallback((r) => {
    const p = procesarData({ ...r });
    return {
      id: crypto.randomUUID(),
      id_registro: null,
      id_tecnico: p.id_tecnico ?? null,
      nombre,
      semana,
      job: p.job ?? "",
      job_name: p.job_name ?? "",
      valor_servicio: p.valor_servicio ?? 0,
      porcentaje_tecnico: p.porcentaje_tecnico ?? 0,
      minimo: p.minimo ?? 0,
      opciones_pago: p.opciones_pago ?? [],
      tipo_pago: p.tipo_pago ?? "CASH",
      valor_tarjeta: p.valor_tarjeta ?? 0,
      valor_efectivo: p.valor_efectivo ?? 0,
      porcentaje_cc: p.porcentaje_cc ?? 0,
      partes_gil: p.partes_gil ?? 0,
      partes_tecnico: p.partes_tecnico ?? 0,
      tech: p.tech ?? 0,
      subtotal: p.subtotal ?? 0,
      total: p.total ?? 0,
      is_cash: p.is_cash ?? false,
      adicional_dolar: p.adicional_dolar ?? 0,
      notas: p.notas ?? [],
    };
  }, [nombre, semana]);

  const buildCreatePayload = useCallback((rows) => rows, []);
  const buildUpdatePayload = useCallback((rows) => rows.map((r) => ({ ...r, id: r.id_registro })), []);

  const services = useMemo(() => ({
    crear: (payload) => envioTablaDB(payload, semana),
    bulkUpdate: (payload) => bulkUpdateRegistros(payload),
    eliminar: (rows) => eliminarRegistrosDb(rows.filter((r) => r.id_registro)),
  }), [semana]);

  const engine = useTablaEditable({
    registros: listRegistro,
    setRegistros: setListRegistros,
    columnas: columnasTablaGeneral,
    editarCelda,
    prepararPegado,
    camposComparar: CAMPOS_COMPARAR,
    buildCreatePayload,
    buildUpdatePayload,
    services,
    onError: setError,
  });

  const { state: eState, handlers: eHandlers } = engine;

  // ── Alta desde el formulario (validación + diferido) ───────────────
  const handleBtnAgregar = async () => {
    const rowLimpio = { ...rowData };
    const camposNumericos = [
      "valor_servicio", "valor_tarjeta", "valor_efectivo", "partes_gil",
      "partes_tecnico", "tech", "porcentaje_cc", "porcentaje_tecnico",
      "adicional_dolar", "subtotal", "total",
    ];
    camposNumericos.forEach((campo) => {
      if (rowLimpio[campo] === "" || rowLimpio[campo] == null) rowLimpio[campo] = 0;
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

    engine.agregarFila(rowCopy);
    setRow(procesarDatosTecnico(data[0]));
  };

  const finalizarTabla = async () => {
    closeModal();
    setLoading(true);
    try {
      const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(() => []);
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
      const response = await exportarExcelDBPost(registrosGuardados, nombre, semana);
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

        if (result.valor_servicio) newRow.valor_servicio = result.valor_servicio;
        if (result.valor_efectivo) newRow.valor_efectivo = result.valor_efectivo;
        if (result.valor_tarjeta) newRow.valor_tarjeta = result.valor_tarjeta;
        if (result.parts_tecnico) newRow.partes_tecnico = result.parts_tecnico;
        if (result.parts_gil) newRow.partes_gil = result.parts_gil;
        if (result.tech) newRow.tech = result.tech;
        if (result.tipo_pago) newRow.tipo_pago = result.tipo_pago.toUpperCase();

        if (data.length > 1 && found) {
          return actualizarPorcentajeCC(procesarDatosTecnico([found], newRow, true)[0]);
        }
        return actualizarPorcentajeCC(procesarDatosTecnico(data, newRow, true)[0]);
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo interpretar el mensaje");
    }
  };

  return {
    elementosAEliminar: eState.elementosAEliminar,
    toggleSeleccion: eHandlers.toggleSeleccion,
    toggleSeleccionTodos: eHandlers.toggleSeleccionTodos,
    columnasTablaEditable,
    columnasTablaGeneral,
    handleBtnAgregar,
    eliminarSeleccionados: eHandlers.eliminarSeleccionados,
    finalizarTabla,
    clickExportExcel,
    exportarExcelDB,
    actualizarCeldaRegistro: eHandlers.actualizarCeldaRegistro,
    procesarMensaje,
    guardarCambios: engine.guardar,
    revertirCambios: engine.deshacer,
    rehacer: engine.rehacer,
    haycambiosPendientes: engine.hayPendientes,
    guardando: engine.guardando,
    confirmacionRef,
    // ── clipboard / selección (del motor) ──
    seleccionCopiable: undefined,
    iniciarDrag: eHandlers.iniciarDrag,
    extenderDrag: eHandlers.extenderDrag,
    copiar: eHandlers.copiar,
    pegar: eHandlers.pegar,
    hayClipboard: eState.hayClipboard,
    clipboardRegistros: eState.clipboardRegistros,
    scrollRef: eHandlers.scrollRef,
  };
}
