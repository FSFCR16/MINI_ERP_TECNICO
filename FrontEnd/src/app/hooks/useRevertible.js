import { useRef, useState, useCallback } from "react"

export function useRevertible(listRef, setList) {
    const snapshotRef = useRef([])
    const [haycambiosPendientes, setHayCambiosPendientes] = useState(false)
    const idsModificadosRef = useRef(new Set())

    const marcarCambio = useCallback((id = null) => {
        if (!haycambiosPendientes) {
            snapshotRef.current = listRef.current.map(r => ({ ...r }))
            console.log("📸 Snapshot tomado:", snapshotRef.current.length, "registros")
        }
        if (id !== null) idsModificadosRef.current.add(id)
        setHayCambiosPendientes(true)
    }, [haycambiosPendientes, listRef])

    const revertirCambios = useCallback((guardando = false) => {
        if (guardando) return
        if (snapshotRef.current.length === 0) return  // ✅ si no hay snapshot no hace nada
        setList(snapshotRef.current)
        snapshotRef.current = []
        idsModificadosRef.current = new Set()
        setHayCambiosPendientes(false)
    }, [setList])

    const confirmarGuardado = useCallback(() => {
        snapshotRef.current = []
        idsModificadosRef.current = new Set()
        setHayCambiosPendientes(false)
    }, [])

    const getIdsModificados = useCallback(() => {
        return idsModificadosRef.current
    }, [])

    return { haycambiosPendientes, marcarCambio, revertirCambios, confirmarGuardado, getIdsModificados }
}