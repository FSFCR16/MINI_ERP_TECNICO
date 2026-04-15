"use client"
import { useEffect, useState, useCallback, useRef } from "react"
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

    const columnasDeshabilitdasGenerales = ["nombre"]

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

    const rowDataBase = data?.length > 0 ? procesarDatosTecnico(data[0]) : {}
    const [rowOverrides, setRowOverrides] = useState({})
    const rowData = { ...rowDataBase, ...rowOverrides }
    const notas = notasOverride ?? rowDataBase?.notas ?? []

    const {
        celdasTablaRef, checkboxMaestroRef, guardandoRef,
        activeCell, setActiveCell,
        activeHeader, setActiveHeader,
        celdaEditando, setCeldaEditando,
        moverseEntreCeldas, moverseEnTablaGeneral, baseRef,
    } = useTablaNavegacion()

    const setRow = (valOrFn) => {
        if (typeof valOrFn === "function") {
            setRowOverrides(prev => {
                const merged = { ...rowDataBase, ...prev }
                const next = valOrFn(merged)
                return next
            })
        } else {
            setRowOverrides(valOrFn)
        }
    }

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
        // ── clipboard ──
        seleccionCopiable,
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        hayClipboard,
        clipboardRegistros,
        scrollRef,
    } = useRegistroActions({
        nombre, semana, data, rowData, setRow,
        listRegistro, setListRegistros,
        registrosLocalStorage, setRegistrosLocalStorage,
        setLoading, setError, setNotas,
        openModal, openError, closeModal,
    })

    const guardarCambiosRef = useRef(guardarCambios)
    useEffect(() => { guardarCambiosRef.current = guardarCambios }, [guardarCambios])

    const revertirCambiosRef = useRef(revertirCambios)
    useEffect(() => { revertirCambiosRef.current = revertirCambios }, [revertirCambios])

    const guardandoRef2 = useRef(guardando)
    useEffect(() => { guardandoRef2.current = guardando }, [guardando])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

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

    if (error) return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-red-300/40 rounded-3xl shadow-2xl px-10 py-16 text-center">
                <p className="text-red-600 font-medium text-lg">{error}</p>
            </div>
        </div>
    )

    const state = {
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
    }

    const handlers = {
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
        // ── clipboard ──
        seleccionCopiable,
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        hayClipboard,
        clipboardRegistros,
        scrollRef,
    }

    const nav = {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        moverseEntreCeldas,
        moverseEnTablaGeneral,
        baseRef,
        setActiveCell,
        setActiveHeader,
        setCeldaEditando,
    }

    const modalState = {
        modal,
        openModal,
        openError,
        closeModal,
    }

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