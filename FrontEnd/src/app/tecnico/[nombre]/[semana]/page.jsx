"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { procesarDatosTecnico } from "../../../../Utils/api.js"
import { MobileView } from "./views/MobileView.jsx"
import { DesktopView } from "./views/DesktopView.jsx"
import { LoadingOverlay } from '@/Components/loadingOverlay.jsx'
import { ModalManager } from '../../components_modal/ModalManager.jsx'
import { useTecnicoData } from './hooks/useTecnicoData.js'
import { useRegistroActions } from './hooks/useRegistroActions.js'
import { useTablaNavegacion } from './hooks/useTablaNavegacion.js'
import { useModalState } from './hooks/useModalState.js'

export default function Page() {
    const { nombre, semana } = useParams()
    const columnasDeshabilitdasGenerales = useMemo(() => ["nombre"], [])

    const { modal, openModal, openError, closeModal } = useModalState()

    const {
        data, setData,
        listRegistro, setListRegistros,
        registrosLocalStorage, setRegistrosLocalStorage,
        semanaFechas,
        loading, setLoading,
        error, setError
    } = useTecnicoData(nombre, semana)

    const tieneError = useCallback((columna) => {
        return modal.errores.some(e => e.key === columna)
    }, [modal.errores])

    const [isMobile, setIsMobile] = useState(false)
    const [resultadoParcial, setResultadoParcial] = useState(null)
    const [camposFaltantes, setCamposFaltantes] = useState([])
    const [notasOverride, setNotas] = useState(null)

    // 1. Memoizamos la base de los datos para que no se procese en cada render
    const rowDataBase = useMemo(() => 
        data?.length > 0 ? procesarDatosTecnico(data[0]) : {}, 
    [data])

    const [rowOverrides, setRowOverrides] = useState({})

    // 2. RowData solo cambia si cambia la base o los overrides
    const rowData = useMemo(() => ({ ...rowDataBase, ...rowOverrides }), [rowDataBase, rowOverrides])
    
    const notas = notasOverride ?? rowDataBase?.notas ?? []

    const {
        celdasTablaRef, checkboxMaestroRef, guardandoRef,
        activeCell, setActiveCell,
        activeHeader, setActiveHeader,
        celdaEditando, setCeldaEditando,
        moverseEntreCeldas, moverseEnTablaGeneral, baseRef,
    } = useTablaNavegacion()

    // 3. useCallback para setRow para mantener estabilidad referencial
    const setRow = useCallback((valOrFn) => {
        if (typeof valOrFn === "function") {
            setRowOverrides(prev => {
                const merged = { ...rowDataBase, ...prev }
                const next = valOrFn(merged)
                return next
            })
        } else {
            setRowOverrides(valOrFn)
        }
    }, [rowDataBase])

    const {
        elementosAEliminar,
        toggleSeleccion, toggleSeleccionTodos,
        columnasTablaEditable, columnasTablaGeneral,
        handleBtnAgregar, eliminarSeleccionados,
        finalizarTabla, clickExportExcel,
        exportarExcelDB, actualizarCeldaRegistro,
        procesarMensaje, guardando,
        guardarCambios,
        revertirCambios,
        haycambiosPendientes,
        confirmacionRef,
        seleccionCopiable,
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        hayClipboard,
        clipboardRegistros,
        scrollRef,
    } = useRegistroActions({
        nombre, semana,semanaFechas, data, rowData, setRow,
        listRegistro, setListRegistros,
        registrosLocalStorage, setRegistrosLocalStorage,
        setLoading, setError, setNotas,
        openModal, openError, closeModal,
    })

    // Refs para shortcuts (se mantienen igual)
    const guardarCambiosRef = useRef(guardarCambios)
    useEffect(() => { guardarCambiosRef.current = guardarCambios }, [guardarCambios])

    const revertirCambiosRef = useRef(revertirCambios)
    useEffect(() => { revertirCambiosRef.current = revertirCambios }, [revertirCambios])

    const guardandoRef2 = useRef(guardando)
    useEffect(() => { guardandoRef2.current = guardando }, [guardando])

    // Resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isS = (e.ctrlKey || e.metaKey) && e.key === "s"
            const isZ = (e.ctrlKey || e.metaKey) && e.key === "z"
            if (!isS && !isZ) return
            e.preventDefault()
            e.stopImmediatePropagation()
            if (isS) guardarCambiosRef.current()
            if (isZ) revertirCambiosRef.current(guardandoRef2.current)
        }
        document.addEventListener("keydown", handleKeyDown, true)
        return () => document.removeEventListener("keydown", handleKeyDown, true)
    }, [])

    // --- BLOQUE DE MEMOIZACIÓN DE PROPS ---

    const state = useMemo(() => ({
        nombre,
        semanaFechas,
        listRegistro,
        rowData,
        data,
        elementosAEliminar,
        columnasDeshabilitdasGenerales,
        columnasTablaGeneral,
        columnasTablaEditable,
        activeCell,
        activeHeader,
        celdaEditando,
        tieneError,
        guardarCambios,
        revertirCambios,
        haycambiosPendientes,
        guardando,
    }), [nombre, semanaFechas, listRegistro, rowData, data, elementosAEliminar, columnasDeshabilitdasGenerales, columnasTablaGeneral, columnasTablaEditable, activeCell, activeHeader, celdaEditando, tieneError, guardarCambios, revertirCambios, haycambiosPendientes, guardando])

    const handlers = useMemo(() => ({
        handleBtnAgregar,
        eliminarSeleccionados,
        clickExportExcel,
        actualizarCeldaRegistro,
        toggleSeleccion,
        toggleSeleccionTodos,
        setRow,
        setNotas,
        guardarCambios,
        revertirCambios,
        seleccionCopiable,
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        hayClipboard,
        clipboardRegistros,
        scrollRef,
    }), [handleBtnAgregar, eliminarSeleccionados, clickExportExcel, actualizarCeldaRegistro, toggleSeleccion, toggleSeleccionTodos, setRow, setNotas, guardarCambios, revertirCambios, seleccionCopiable, iniciarDrag, extenderDrag, copiar, pegar, hayClipboard, clipboardRegistros, scrollRef])

    const nav = useMemo(() => ({
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEntreCeldas,
        moverseEnTablaGeneral,
        baseRef,
        setActiveCell,
        setActiveHeader,
        setCeldaEditando,
    }), [celdasTablaRef, checkboxMaestroRef, guardandoRef, moverseEntreCeldas, moverseEnTablaGeneral, baseRef, setActiveCell, setActiveHeader, setCeldaEditando])

    const modalState = useMemo(() => ({
        modal,
        openModal,
        openError,
        closeModal,
    }), [modal, openModal, openError, closeModal])

    if (error) return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-red-300/40 rounded-3xl shadow-2xl px-10 py-16 text-center">
                <p className="text-red-600 font-medium text-lg">{error}</p>
            </div>
        </div>
    )

    return (
        <>
            {loading && <LoadingOverlay />}
            {isMobile
                ? <MobileView {...state} {...handlers} {...nav} openModal={openModal} />
                : <DesktopView state={state} handlers={handlers} nav={nav} modal={modalState} />
            }

            <ModalManager
                modal={modal}
                closeModal={closeModal}
                openModal={openModal}
                finalizarTabla={finalizarTabla}
                exportarExcelDB={exportarExcelDB}
                notas={notas}
                setError={setError}
                setLoading={setLoading}
                nombre={nombre}
                procesarMensaje={procesarMensaje}
                setResultadoParcial={setResultadoParcial}
                setCamposFaltantes={setCamposFaltantes}
                camposFaltantes={camposFaltantes}
                resultadoParcial={resultadoParcial}
                confirmacionRef={confirmacionRef}
            />
        </>
    )
}