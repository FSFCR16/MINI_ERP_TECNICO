import { useRef, useEffect, useCallback } from "react"
import { useSeleccionStore } from "../stores/useClipboardStore"

export function useDragSelect(listaVisible) {
    const isDragging = useRef(false)
    const dragStartId = useRef(null)
    const dragCurrentId = useRef(null)
    const anchorId = useRef(null)          // ← anchor para Shift+Click
    const scrollRef = useRef(null)
    const rafRef = useRef(null)
    const listaRef = useRef(listaVisible)
    useEffect(() => { listaRef.current = listaVisible }, [listaVisible])

    // ── Leer selección reactiva para exponerla ────────────────
    const seleccionCopiable = useSeleccionStore(s => s.seleccion)

    const calcularRango = useCallback((idA, idB) => {
        const ids = listaRef.current.map(r => r.id_registro ?? r.id)
        const iA = ids.indexOf(idA)
        const iB = ids.indexOf(idB)
        if (iA === -1 || iB === -1) return new Set([idA])
        const [from, to] = iA < iB ? [iA, iB] : [iB, iA]
        return new Set(ids.slice(from, to + 1))
    }, [])

    // ── Drag normal (mousedown) ───────────────────────────────
    const iniciarDrag = useCallback((id, e) => {
        console.log("🖱️ iniciarDrag llamado", { id, isDragging: isDragging.current, shiftKey: e?.shiftKey })
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

        // ← SOLO iniciar drag desde el mousedown original, no de filas intermedias
        if (isDragging.current) return   // ← ESTE ES EL FIX

        isDragging.current = true
        dragStartId.current = id
        dragCurrentId.current = id
        anchorId.current = id
        useSeleccionStore.setState({ seleccion: new Set([id]) })
        console.log("✅ drag iniciado desde:", id)
    }, [calcularRango])

    const extenderDrag = useCallback((id) => {
        console.log("↔️ extenderDrag llamado", { id, isDragging: isDragging.current, dragStartId: dragStartId.current })
        if (!isDragging.current) return
        if (dragCurrentId.current === id) return
        dragCurrentId.current = id
        const rango = calcularRango(dragStartId.current, id)
        console.log("📐 rango calculado:", [...rango])
        useSeleccionStore.setState({ seleccion: rango })
    }, [calcularRango])

    const terminarDrag = useCallback(() => {
        if (!isDragging.current) return
        console.log("🛑 terminarDrag — selección final:", [...useSeleccionStore.getState().seleccion])
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

    return { seleccionCopiable, iniciarDrag, extenderDrag, limpiarSeleccion, scrollRef }
}