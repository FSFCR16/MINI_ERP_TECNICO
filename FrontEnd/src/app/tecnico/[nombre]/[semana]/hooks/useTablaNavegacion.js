import { useState, useRef } from "react"

export function useTablaNavegacion() {

    const inputsReferencias = useRef([])
    const celdasTablaRef = useRef({})
    const checkboxMaestroRef = useRef(null)
    const guardandoRef = useRef(false)

    const [activeCell, setActiveCell] = useState(null)
    const [activeHeader, setActiveHeader] = useState(null)
    const [celdaEditando, setCeldaEditando] = useState(null)

    const moverseEntreCeldas = (e, colIndex) => {
        if (e.target.tagName === "SELECT") e.preventDefault()

        // Fix: verifica que el array de referencias exista antes de navegar
        const fila = inputsReferencias.current[0]
        if (!fila) return

        if (e.key === "ArrowRight") fila[colIndex + 1]?.focus()
        if (e.key === "ArrowLeft")  fila[colIndex - 1]?.focus()
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

    return {
        celdasTablaRef,
        checkboxMaestroRef,
        guardandoRef,
        activeCell, setActiveCell,
        activeHeader, setActiveHeader,
        celdaEditando, setCeldaEditando,
        moverseEntreCeldas,
        moverseEnTablaGeneral,
        baseRef,
    }
}