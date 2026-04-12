import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
    envioTablaDB,
    getRegistrosPrevios,
    eliminarRegistrosDb,
    exportarExcelDBPost,
    updateRegistro
} from "../../../../../Services/tencicosServices.js"
import { procesarDatosTecnico, procesarData, formatearNumero, mapearErroresZod } from "../../../../../Utils/api.js"
import { tecnicoSchema } from '@/app/schemas/tecnicoSchema.js'
import { columnasBase } from '../tableRow/columnasBase.jsx'
import { useRevertible } from '../../../../../app/hooks/useRevertible.js'

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
    setNotas,
    openModal,
    openError,
    closeModal,
}) {
    const [elementosAEliminar, setElementosAEliminar] = useState([])
    const [guardando, setGuardando] = useState(false)

    const openModalRef = useRef(openModal)
    useEffect(() => { openModalRef.current = openModal }, [openModal])

    const listRegistroRef = useRef(listRegistro)
    useEffect(() => { listRegistroRef.current = listRegistro }, [listRegistro])

    const { haycambiosPendientes, marcarCambio, revertirCambios, confirmarGuardado, getIdsModificados } =
        useRevertible(listRegistroRef, setListRegistros)

    const buildColumns = (rowDataParam = {}, tipoTabla) =>
        columnasBase
            .map(col => ({
                ...col,
                visible: !col.hideOn?.includes(tipoTabla) && !col.disableOnPago?.includes(rowDataParam.tipo_pago),
                disabled: !col.disableOn?.includes(tipoTabla),
            }))
            .filter(c => c.visible)

    const columnasTablaEditable = useMemo(() => buildColumns(rowData, "editable"), [rowData.tipo_pago])
    const columnasTablaGeneral  = useMemo(() => buildColumns({}, "general"), [])

    const toggleSeleccion = (dataEliminar) => {
        setElementosAEliminar(prev =>
            prev.includes(dataEliminar)
                ? prev.filter(e => e !== dataEliminar)
                : [...prev, dataEliminar]
        )
    }

    const toggleSeleccionTodos = () => {
        setElementosAEliminar(
            elementosAEliminar.length === listRegistro.length ? [] : [...listRegistro]
        )
    }

    const handleBtnAgregar = async () => {
        // ✅ Primero limpias, luego procesás
        const rowLimpio = { ...rowData }
        if (rowLimpio.tipo_pago?.toLowerCase() !== "mixto") {
            rowLimpio.valor_tarjeta = 0
            rowLimpio.valor_efectivo = 0
        }

        const rowCopy = procesarData(rowLimpio)  // 👈 antes pasabas { ...rowData } directo
        rowCopy.id = crypto.randomUUID()

        const resultado = tecnicoSchema.safeParse(rowCopy)
        if (!resultado.success) {
            openError(mapearErroresZod(resultado.error))
            return
        }

        setListRegistros(prev => [...prev, rowCopy])
        setRow(procesarDatosTecnico(data[0]))

        try {
            const res = await envioTablaDB([rowCopy], semana)
            const idReal = res?.registros?.[0]?.id

            if (idReal) {
                setListRegistros(prev =>
                    prev.map(r => r.id === rowCopy.id
                        ? { ...r, id_registro: idReal }
                        : r
                    )
                )
            }
        } catch (err) {
            console.error("Error guardando:", err)
            setListRegistros(prev => prev.filter(r => r.id !== rowCopy.id))
            openModal("ERROR_GUARDADO")
        }
    }

    const eliminarSeleccionados = async () => {
        setListRegistros(listRegistro.filter(d => !elementosAEliminar.includes(d)))
        await eliminarRegistrosDb(elementosAEliminar.filter(d => d.id_registro))
        setElementosAEliminar([])
    }

    const finalizarTabla = async () => {
        closeModal()
        setLoading(true)
        try {
            const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(() => [])
            const dataPreviaProcesada = registrosPrevios.flatMap(dato => {
                const tecnicoMatch = data.find(
                    t => t.job.replace(/\s+/g, "") === dato.job.replace(/\s+/g, "")
                )
                if (!tecnicoMatch) return []
                return procesarDatosTecnico([tecnicoMatch], dato)
            })
            setListRegistros(dataPreviaProcesada)
        } catch (error) {
            console.error("Error:", error)
        }
        setLoading(false)
    }

    const clickExportExcel = () => {
        if (listRegistro.length === 0) {
            openModal("SIN_REGISTROS")
            return
        }
        openModal("EXPORTAR")
    }

    const exportarExcelDB = async () => {
        try {
            closeModal()
            setLoading(true)
            const registrosGuardados = listRegistro.filter(e => e.id_registro)
            if (!registrosGuardados.length) {
                openModal("SIN_REGISTROS")
                return
            }
            const response = await exportarExcelDBPost(registrosGuardados, nombre, semana)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${nombre}_${semana}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
        } catch (error) {
            console.error("Error exportando:", error)
        } finally {
            setLoading(false)
        }
    }

    const actualizarCeldaRegistro = (rowIndex, colKey, nuevoValor) => {
        marcarCambio(listRegistroRef.current[rowIndex]?.id_registro)  // ✅ usa el ref antes del update
        setListRegistros(prev => {
            const copia = [...prev]
            const filaActual = copia[rowIndex]
            let filaActualizada = { ...filaActual, [colKey]: nuevoValor }

            // Si tipo_pago no es MIXTO, limpiar valor_tarjeta y valor_efectivo
            if (colKey === "tipo_pago" && nuevoValor.toLowerCase() !== "mixto") {
                filaActualizada.valor_tarjeta = 0
                filaActualizada.valor_efectivo = 0
            }

            // Si editan valor_tarjeta o valor_efectivo y no es MIXTO, ignorar
            if ((colKey === "valor_tarjeta" || colKey === "valor_efectivo") && 
                filaActualizada.tipo_pago?.toLowerCase() !== "mixto") {
                filaActualizada[colKey] = 0
            }

            if (colKey === "porcentaje_cc") {
                filaActualizada.porcentaje_cc_base = null
            }

            if (colKey === "tipo_pago") {
                const nuevoTipo = nuevoValor.toLowerCase()
                if (nuevoTipo === "cc" || nuevoTipo === "mixto") {
                    if (!filaActualizada.porcentaje_cc && filaActualizada.porcentaje_cc_original) {
                        filaActualizada.porcentaje_cc = formatearNumero(
                            filaActualizada.valor_servicio * (filaActualizada.porcentaje_cc_original / 100)
                        )
                        filaActualizada.porcentaje_cc_base = filaActualizada.porcentaje_cc_original
                    }
                }
                if (nuevoTipo === "cash") {
                    filaActualizada.porcentaje_cc = 0
                    filaActualizada.porcentaje_cc_base = filaActualizada.porcentaje_cc_original
                }
            }

            const camposQueRecalculan = [
                "valor_servicio", "valor_efectivo", "valor_tarjeta",
                "partes_gil", "partes_tecnico", "tech", "tipo_pago",
                "aplica_dolar_empresa", "adicional_dolar",
                "porcentaje_tecnico", "porcentaje_cc"
            ]

            const filaFinal = camposQueRecalculan.includes(colKey)
                ? procesarData({ ...filaActualizada })
                : filaActualizada

            copia[rowIndex] = filaFinal
            return copia
        })
    }

    const guardarCambios = useCallback(async () => {
        if (!haycambiosPendientes) return
        const ids = getIdsModificados()
        const registrosConId = listRegistroRef.current.filter(r =>
            r.id_registro && ids.has(r.id_registro)
        )
        if (!registrosConId.length) return

        setGuardando(true)
        try {
            await Promise.all(
                registrosConId.map(r => updateRegistro(r.id_registro, r))
            )
            confirmarGuardado()
        } catch (err) {
            console.error("Error guardando:", err)
            openModalRef.current("ERROR_GUARDADO")
        } finally {
            setGuardando(false)
        }
    }, [confirmarGuardado, haycambiosPendientes, getIdsModificados])

    const procesarMensaje = (result) => {
        try {
            setRow(prev => {
                let newRow = { ...prev }
                let found

                if (result.job_name) newRow.job_name = result.job_name.toUpperCase()

                if (data[0].job !== "TODO") {
                    if (result.job_type) {
                        const jobClean = result.job_type.replace(/\s+/g, "")
                        if (["LOCKOUT", "CARKEY"].includes(jobClean)) {
                            newRow.job = result.job_type.toUpperCase()
                        }
                        found = data.find(d =>
                            d.job.replace(/\s+/g, "") === jobClean
                        )
                    }
                }

                if (result.valor_servicio) newRow.valor_servicio = result.valor_servicio
                if (result.valor_efectivo) newRow.valor_efectivo = result.valor_efectivo
                if (result.valor_tarjeta)  newRow.valor_tarjeta  = result.valor_tarjeta
                if (result.parts_tecnico)  newRow.partes_tecnico = result.parts_tecnico
                if (result.parts_gil)      newRow.partes_gil     = result.parts_gil
                if (result.tipo_pago)      newRow.tipo_pago      = result.tipo_pago.toUpperCase()

                if (data.length > 1 && found) return procesarDatosTecnico([found], newRow, true)[0]
                return procesarDatosTecnico(data, newRow, true)[0]
            })
        } catch (err) {
            console.error(err)
            setError("No se pudo interpretar el mensaje")
        }
    }

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
        guardando
    }
}