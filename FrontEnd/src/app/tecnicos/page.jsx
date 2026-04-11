"use client"
import { useReducer, useState, useRef } from "react"
import { Fragment } from "react"
import { Transition, Dialog, DialogPanel } from "@headlessui/react"
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx"
import { ContentNoList } from "../tecnico/components_modal/content_noList.jsx"
import { ContentList } from "../tecnico/components_modal/content_list.jsx"
import { TrabajosView } from "./trabajosview.js"
import { useTrabajosActions } from "./hooks/useTrabajosActions.js"

// ============================================================
// REDUCER DEL MODAL — mismo patrón que page.jsx de registros
// ============================================================
const modalInicial = { isOpen: false, tipo: "", errores: [] }

function modalReducer(state, action) {
    switch (action.type) {
        case "OPEN_ERROR":
            return { isOpen: true, tipo: "ERROR", errores: action.payload }
        case "OPEN_MODAL":
            return { isOpen: true, tipo: action.payload, errores: [] }
        case "CLOSE":
            return { isOpen: false, tipo: "", errores: [] }
        default:
            return state
    }
}

function getConfigModal({ modal, confirmarAccion }) {
    return {
        "CONFIRMAR_ELIMINAR": {
            title: "ELIMINAR TÉCNICO",
            message: "¿Seguro que deseas eliminar los técnicos seleccionados? Esta acción no se puede deshacer.",
            confirmText: "ELIMINAR",
            cancelText: "CANCELAR",
            hasFunction: true,
            showBtn: true,
            modalRender: 1,
            functionName: () => confirmarAccion()
        },
        "ERROR": {
            title: "CAMPOS FALTANTES",
            message: modal.errores,
            cancelText: "CERRAR",
            modalRender: 2,
            showBtn: false,
        },
    }
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Page() {
    const [modal, dispatchModal] = useReducer(modalReducer, modalInicial)
    const [accionPendiente, setAccionPendiente] = useState(null)

    const celdasTablaRef = useRef({})
    const checkboxMaestroRef = useRef(null)
    const guardandoRef = useRef(false)
    const inputsReferencias = useRef([])
    const [activeCell, setActiveCell] = useState(null)
    const [activeHeader, setActiveHeader] = useState(null)
    const [celdaEditando, setCeldaEditando] = useState(null)

    const openModal = (tipo) => dispatchModal({ type: "OPEN_MODAL", payload: tipo })
    const openError = (errores) => dispatchModal({ type: "OPEN_ERROR", payload: errores })
    const closeModal = () => dispatchModal({ type: "CLOSE" })

    const confirmarAccion = () => {
        if (accionPendiente) {
            accionPendiente()
            setAccionPendiente(null)
        }
        closeModal()
    }

    const pedirConfirmacion = (fn) => {
        setAccionPendiente(() => fn)
        openModal("CONFIRMAR_ELIMINAR")
    }

    const {
        trabajos,
        rowData,
        setRow,
        loading,
        elementosAEliminar,
        toggleSeleccion,
        toggleSeleccionTodos,
        columnasTablaGeneral,
        columnasTablaEditable,
        handleBtnAgregar,
        eliminarSeleccionados,
        actualizarCeldaTrabajo,
        guardando,
        guardarCambios,        // ✅ nuevo
        haycambiosPendientes,  // ✅ nuevo
    } = useTrabajosActions({
        openError,
        openModal,
        closeModal,
        pedirConfirmacion,
    })

    const moverseEntreCeldas = (e, colIndex) => {
        if (e.target.tagName === "SELECT") e.preventDefault()
        if (e.key === "ArrowRight") inputsReferencias.current[0]?.[colIndex + 1]?.focus()
        if (e.key === "ArrowLeft")  inputsReferencias.current[0]?.[colIndex - 1]?.focus()
    }

    const moverseEnTablaGeneral = (e, rowIndex, colIndex) => {
        if (e.key === "ArrowDown")  { e.preventDefault(); celdasTablaRef.current[`${rowIndex + 1}-${colIndex}`]?.focus() }
        if (e.key === "ArrowUp")    { e.preventDefault(); celdasTablaRef.current[`${rowIndex - 1}-${colIndex}`]?.focus() }
        if (e.key === "ArrowRight") { e.preventDefault(); celdasTablaRef.current[`${rowIndex}-${colIndex + 1}`]?.focus() }
        if (e.key === "ArrowLeft")  { e.preventDefault(); celdasTablaRef.current[`${rowIndex}-${colIndex - 1}`]?.focus() }
    }

    const baseRef = (index, el) => {
        if (!inputsReferencias.current[0]) inputsReferencias.current[0] = []
        inputsReferencias.current[0][index] = el
    }

    const configModal = getConfigModal({ modal, confirmarAccion })

    return (
        <>
            {loading && <LoadingOverlay />}

            <TrabajosView
                state={{
                    trabajos,
                    rowData,
                    elementosAEliminar,
                    columnasTablaGeneral,
                    columnasTablaEditable,
                    activeCell,
                    activeHeader,
                    celdaEditando,
                    guardando,
                    haycambiosPendientes,
                }}
                handlers={{
                    setRow,
                    toggleSeleccion,
                    toggleSeleccionTodos,
                    eliminarSeleccionados: () => pedirConfirmacion(eliminarSeleccionados),
                    handleBtnAgregar,
                    actualizarCeldaTrabajo,
                    setActiveCell,
                    setActiveHeader,
                    setCeldaEditando,
                    guardarCambios,
                }}
                nav={{
                    celdasTablaRef,
                    checkboxMaestroRef,
                    guardandoRef,
                    moverseEntreCeldas,
                    moverseEnTablaGeneral,
                    baseRef,
                }}
            />

            {/* MODAL */}
            <Transition appear show={modal.isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeModal}>
                    <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <DialogPanel className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40">
                                {configModal[modal.tipo]?.modalRender === 1 && (
                                    <ContentNoList
                                        message={configModal[modal.tipo].message}
                                        title={configModal[modal.tipo].title}
                                        btnTextCancel={configModal[modal.tipo].cancelText}
                                        btnTextConfirm={configModal[modal.tipo].confirmText}
                                        setIsOpen={closeModal}
                                        hasFunction={configModal[modal.tipo]?.hasFunction}
                                        functionAction={configModal[modal.tipo]?.functionName}
                                        showBtn={configModal[modal.tipo]?.showBtn}
                                    />
                                )}
                                {configModal[modal.tipo]?.modalRender === 2 && (
                                    <ContentList
                                        message={configModal[modal.tipo].message}
                                        title={configModal[modal.tipo]?.title}
                                        btnTextCancel={configModal[modal.tipo]?.cancelText}
                                        setIsOpen={closeModal}
                                        modalTipo={modal.tipo}
                                    />
                                )}
                            </DialogPanel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}