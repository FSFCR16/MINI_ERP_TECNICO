import { useReducer } from "react"

const modalInicial = { isOpen: false, tipo: "", errores: [], data: null }

function modalReducer(state, action) {
    switch (action.type) {
        case "OPEN_ERROR":
            return { isOpen: true, tipo: "ERROR", errores: action.payload, data: null }
        case "OPEN_MODAL":
            return { isOpen: true, tipo: action.payload.tipo, errores: [], data: action.payload.data ?? null }
        case "CLOSE":
            return { isOpen: false, tipo: "", errores: [], data: null }
        default:
            return state
    }
}

export function useModalState() {
    const [modal, dispatch] = useReducer(modalReducer, modalInicial)

    const openModal  = (tipo, data = null) => dispatch({ type: "OPEN_MODAL", payload: { tipo, data } })
    const openError  = (errores)           => dispatch({ type: "OPEN_ERROR", payload: errores })
    const closeModal = ()                  => dispatch({ type: "CLOSE" })

    return { modal, openModal, openError, closeModal }
}