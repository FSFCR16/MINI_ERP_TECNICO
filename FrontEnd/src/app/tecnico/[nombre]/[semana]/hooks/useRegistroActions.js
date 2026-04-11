import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
    envioTablaDB,
    getRegistrosPrevios,
    eliminarRegistrosDb,
    exportarExcelDBPost,
    updateRegistro
} from "../../../../../Services/tencicosServices.js"

import { procesarDatosTecnico, procesarData, formatearNumero } from "../../../../../Utils/api.js"
import { tecnicoSchema } from '@/app/schemas/tecnicoSchema.js'
import { columnasBase } from '../tableRow/columnasBase.jsx'

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
    const [haycambiosPendientes, setHayCambiosPendientes] = useState(false)

    const openModalRef = useRef(openModal)
    useEffect(() => { openModalRef.current = openModal }, [openModal])

    // ✅ Ref para que guardarCambios siempre vea el listRegistro fresco
    const listRegistroRef = useRef(listRegistro)
    useEffect(() => { listRegistroRef.current = listRegistro }, [listRegistro])

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

    const mapearErroresZod = (error) =>
        error.issues.map(issue => ({
            label: issue.path[0].replaceAll("_", " ").toUpperCase(),
            message: issue.message,
            key: issue.path[0],
        }))
        
    const handleBtnAgregar = async () => {
        const rowCopy = procesarData({ ...rowData })
        rowCopy.id = crypto.randomUUID()

        const resultado = tecnicoSchema.safeParse(rowCopy)
        if (!resultado.success) {
            openError(mapearErroresZod(resultado.error))
            return
        }

        // 1. Agrega optimistamente a la tabla
        setListRegistros(prev => [...prev, rowCopy])
        setRow(procesarDatosTecnico(data[0]))

        try {
            // 2. Guarda en DB
            await envioTablaDB([rowCopy], semana)

            // 3. Trae los registros frescos del backend con sus ids reales
            const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(() => null)
            if (!registrosPrevios) return

            const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                procesarDatosTecnico(data, dato)
            )

            // 4. Reemplaza la lista completa con los datos frescos (con id_registro correcto)
            setListRegistros(dataPreviaProcesada)

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
            const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                procesarDatosTecnico(data, dato)
            )
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
        setListRegistros(prev => {
            const copia = [...prev]
            const filaActual = copia[rowIndex]
            let filaActualizada = { ...filaActual, [colKey]: nuevoValor }

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

        setHayCambiosPendientes(true)
    }

    // ✅ Sin stale closure — usa ref para leer listRegistro fresco
    const guardarCambios = useCallback(async () => {
        const registrosConId = listRegistroRef.current.filter(r => r.id_registro)
        
        // 👇 LOG 1: ¿hay registros con id para guardar?
        console.log("Registros a guardar:", registrosConId.length, registrosConId.map(r => r.id_registro))
        
        if (!registrosConId.length) return

        setGuardando(true)
        try {
            const resultados = await Promise.all(
                registrosConId.map(r => updateRegistro(r.id_registro, r))
            )
            // 👇 LOG 2: ¿el backend respondió OK?
            console.log("Guardado OK:", resultados)
            setHayCambiosPendientes(false)
        } catch (err) {
            // 👇 LOG 3: ¿hubo error?
            console.error("Error guardando:", err)
            openModalRef.current("ERROR_GUARDADO")
        } finally {
            setGuardando(false)
        }
    }, [])
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
        haycambiosPendientes,
        guardando
    }
}