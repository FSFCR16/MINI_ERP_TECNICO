// /app/tecnico/[nombre]/[semana]/hooks/useModalState.js
import { useReducer } from "react"

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

export function useModalState() {
    const [modal, dispatch] = useReducer(modalReducer, modalInicial)

    const openModal  = (tipo)    => dispatch({ type: "OPEN_MODAL", payload: tipo })
    const openError  = (errores) => dispatch({ type: "OPEN_ERROR", payload: errores })
    const closeModal = ()        => dispatch({ type: "CLOSE" })

    return { modal, openModal, openError, closeModal }
}