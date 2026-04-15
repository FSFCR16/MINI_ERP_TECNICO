import { useRef, useEffect, useCallback } from "react"
import { useSeleccionStore } from "../stores/useClipboardStore"

export function useDragSelect(listaVisible) {
    const isDragging = useRef(false)
    const dragStartId = useRef(null)
    const dragCurrentId = useRef(null)
    const anchorId = useRef(null)
    const scrollRef = useRef(null)
    const rafRef = useRef(null)
    const listaRef = useRef(listaVisible)
    useEffect(() => { listaRef.current = listaVisible }, [listaVisible])

    // ── FIX: NO suscribirse al store aquí con useSeleccionStore(s => s.seleccion).
    // Esa línea hacía que el componente padre re-renderizara en CADA cambio de selección,
    // incluyendo cada mousemove durante el drag. El padre re-renderizaba, pasaba props
    // nuevas a TablaRegistros, y TablaRegistros re-renderizaba aunque nada cambiara.
    //
    // La solución: leer seleccionCopiable via getState() (fuera de React)
    // solo cuando se necesita (al copiar). El hook ya no es subscriber del store.
    const getSeleccionCopiable = useCallback(() => {
        return useSeleccionStore.getState().seleccion
    }, [])

    const calcularRango = useCallback((idA, idB) => {
        const ids = listaRef.current.map(r => r.id_registro ?? r.id)
        const iA = ids.indexOf(idA)
        const iB = ids.indexOf(idB)
        if (iA === -1 || iB === -1) return new Set([idA])
        const [from, to] = iA < iB ? [iA, iB] : [iB, iA]
        return new Set(ids.slice(from, to + 1))
    }, [])

    const iniciarDrag = useCallback((id, e) => {
        if (e?.shiftKey && anchorId.current) {
            const rango = calcularRango(anchorId.current, id)
            useSeleccionStore.setState({ seleccion: rango })
            return
        }

        if (e?.ctrlKey || e?.metaKey) {
            const prev = useSeleccionStore.getState().seleccion
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            useSeleccionStore.setState({ seleccion: next })
            anchorId.current = id
            return
        }

        if (isDragging.current) return

        isDragging.current = true
        dragStartId.current = id
        dragCurrentId.current = id
        anchorId.current = id
        useSeleccionStore.setState({ seleccion: new Set([id]) })
    }, [calcularRango])

    const extenderDrag = useCallback((id) => {
        if (!isDragging.current) return
        if (dragCurrentId.current === id) return
        dragCurrentId.current = id
        const rango = calcularRango(dragStartId.current, id)
        useSeleccionStore.setState({ seleccion: rango })
    }, [calcularRango])

    const terminarDrag = useCallback(() => {
        if (!isDragging.current) return
        isDragging.current = false
        dragCurrentId.current = null
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [])

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current) return
        const container = scrollRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const ZONE = 60
        const SPEED = 8
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        const scroll = () => {
            if (!isDragging.current) return
            const distBottom = rect.bottom - e.clientY
            const distTop = e.clientY - rect.top
            if (distBottom < ZONE && distBottom > 0) {
                container.scrollTop += SPEED * (1 - distBottom / ZONE)
                rafRef.current = requestAnimationFrame(scroll)
            } else if (distTop < ZONE && distTop > 0) {
                container.scrollTop -= SPEED * (1 - distTop / ZONE)
                rafRef.current = requestAnimationFrame(scroll)
            }
        }
        scroll()
    }, [])

    const seleccionarTodos = useCallback(() => {
        const ids = listaRef.current.map(r => r.id_registro ?? r.id)
        useSeleccionStore.setState({ seleccion: new Set(ids) })
    }, [])

    const limpiarSeleccion = useCallback(() => {
        const { seleccion } = useSeleccionStore.getState()
        if (seleccion.size === 0) return
        useSeleccionStore.setState({ seleccion: new Set() })
        anchorId.current = null
    }, [])

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault()
                seleccionarTodos()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [seleccionarTodos])

    useEffect(() => {
        window.addEventListener('mouseup', terminarDrag)
        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('mouseup', terminarDrag)
            window.removeEventListener('mousemove', handleMouseMove)
        }
    }, [terminarDrag, handleMouseMove])

    // ── Exponer getSeleccionCopiable en vez del valor reactivo.
    // useClipboardActions lo llama al momento de copiar (no necesita reactividad).
    return { getSeleccionCopiable, iniciarDrag, extenderDrag, limpiarSeleccion, scrollRef }
}