import { useState, useCallback, useEffect, useRef } from "react"
import { useDragSelect } from "@/app/hooks/useDragSelect"
import { useClipboardStore, useSeleccionStore } from "@/app/stores/useClipboardStore"
import { useTablaNavegacion } from "@/app/tecnico/[nombre]/[semana]/hooks/useTablaNavegacion"

const idDe = (r) => r.id_registro ?? r.id
const clonar = (arr) => arr.map((r) => ({ ...r }))
const LIMITE_HISTORIAL = 100
const norm = (v) => (v === null || v === undefined ? "" : String(v))

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR GENÉRICO de tabla editable. Lo comparten la tabla general y Virginia.
// Aporta: edición inline, selección/drag, copiar-pegar, modelo DIFERIDO con
// historial multinivel (Ctrl+Z / Ctrl+Y) y guardado por diff (Ctrl+S).
//
// Cada módulo solo inyecta su parte específica vía `cfg`:
//   registros, setRegistros        → estado de la lista (vive en el hook de datos)
//   columnas                       → definición de columnas para TablaRegistros
//   editarCelda(fila, key, valor)  → aplica el cambio + recálculo propio del módulo
//   prepararPegado(filaClip)       → mapea una fila del portapapeles a fila nueva local
//   camposComparar                 → keys para el diff (qué cambió vs lo guardado)
//   buildCreatePayload(rows)       → payload para services.crear (mismo orden que rows)
//   buildUpdatePayload(rows)       → payload para services.bulkUpdate
//   services { crear, bulkUpdate, eliminar }
//   onError?(msg)
// ─────────────────────────────────────────────────────────────────────────────
export function useTablaEditable(cfg) {
    const {
        registros, setRegistros, columnas,
        editarCelda, prepararPegado, camposComparar,
        buildCreatePayload, buildUpdatePayload, services, onError,
    } = cfg

    const nav = useTablaNavegacion()
    const { iniciarDrag, extenderDrag, limpiarSeleccion, scrollRef } = useDragSelect(registros)
    const { clipboardRegistros, copiarRegistros, limpiarClipboard } = useClipboardStore()

    const [elementosAEliminar, setElementosAEliminar] = useState([])
    const [guardando, setGuardando] = useState(false)
    const [meta, setMeta] = useState({ puedeDeshacer: false, puedeRehacer: false, hayPendientes: false })

    const registrosRef = useRef(registros)
    useEffect(() => { registrosRef.current = registros }, [registros])

    const baselineRef = useRef(null)   // última foto sincronizada con la DB
    const undoRef = useRef([])
    const redoRef = useRef([])
    const localOpRef = useRef(false)   // marca que el próximo cambio de registros es local

    const fila_cambio = useCallback(
        (a, b) => camposComparar.some((k) => norm(a[k]) !== norm(b[k])),
        [camposComparar]
    )

    const calcularDiff = useCallback((lista) => {
        const base = baselineRef.current ?? []
        const baseById = new Map(base.filter((r) => r.id_registro).map((r) => [r.id_registro, r]))
        const idsActuales = new Set(lista.filter((r) => r.id_registro).map((r) => r.id_registro))
        const toCreate = lista.filter((r) => !r.id_registro)
        const toUpdate = lista.filter((r) => r.id_registro && baseById.has(r.id_registro) && fila_cambio(r, baseById.get(r.id_registro)))
        // filas completas (no solo ids): cada módulo mapea lo que su backend espera
        const toDelete = base.filter((r) => r.id_registro && !idsActuales.has(r.id_registro))
        return { toCreate, toUpdate, toDelete }
    }, [fila_cambio])

    const sync = useCallback((lista) => {
        const { toCreate, toUpdate, toDelete } = calcularDiff(lista)
        setMeta({
            puedeDeshacer: undoRef.current.length > 0,
            puedeRehacer: redoRef.current.length > 0,
            hayPendientes: toCreate.length + toUpdate.length + toDelete.length > 0,
        })
    }, [calcularDiff])

    const aplicar = useCallback((siguiente) => {
        undoRef.current.push(clonar(registrosRef.current))
        if (undoRef.current.length > LIMITE_HISTORIAL) undoRef.current.shift()
        redoRef.current = []
        localOpRef.current = true
        registrosRef.current = siguiente
        setRegistros(siguiente)
        sync(siguiente)
    }, [setRegistros, sync])

    // Cambio EXTERNO de registros (carga/recarga) → nuevo baseline e historial limpio.
    useEffect(() => {
        if (localOpRef.current) { localOpRef.current = false; return }
        baselineRef.current = clonar(registros)
        undoRef.current = []
        redoRef.current = []
        setMeta({ puedeDeshacer: false, puedeRehacer: false, hayPendientes: false })
    }, [registros])

    const deshacer = useCallback(() => {
        if (!undoRef.current.length) return
        const previa = undoRef.current.pop()
        redoRef.current.push(clonar(registrosRef.current))
        localOpRef.current = true
        registrosRef.current = previa
        setRegistros(previa)
        sync(previa)
    }, [setRegistros, sync])

    const rehacer = useCallback(() => {
        if (!redoRef.current.length) return
        const siguiente = redoRef.current.pop()
        undoRef.current.push(clonar(registrosRef.current))
        localOpRef.current = true
        registrosRef.current = siguiente
        setRegistros(siguiente)
        sync(siguiente)
    }, [setRegistros, sync])

    const toggleSeleccion = useCallback((row) => {
        setElementosAEliminar((prev) => prev.includes(row) ? prev.filter((e) => e !== row) : [...prev, row])
    }, [])

    const toggleSeleccionTodos = useCallback(() => {
        setElementosAEliminar((prev) => prev.length === registrosRef.current.length ? [] : [...registrosRef.current])
    }, [])

    const eliminarSeleccionados = useCallback(() => {
        const sel = new Set(elementosAEliminar)
        if (sel.size === 0) return
        aplicar(registrosRef.current.filter((r) => !sel.has(r)))
        setElementosAEliminar([])
    }, [elementosAEliminar, aplicar])

    const actualizarCeldaRegistro = useCallback((rowId, colKey, nuevoValor) => {
        const lista = registrosRef.current
        const i = lista.findIndex((r) => idDe(r) === rowId)
        if (i === -1) return
        if (norm(lista[i][colKey]) === norm(nuevoValor)) return // sin cambio real
        const filaFinal = editarCelda(lista[i], colKey, nuevoValor)
        const siguiente = [...lista]
        siguiente[i] = filaFinal
        aplicar(siguiente)
    }, [aplicar, editarCelda])

    const agregarFila = useCallback((fila) => {
        const local = { ...fila, id: fila.id ?? crypto.randomUUID(), id_registro: null }
        aplicar([local, ...registrosRef.current])
    }, [aplicar])

    // Alta INMEDIATA (optimista): inserta la fila al instante y la persiste en la
    // DB por debajo. Si el guardado falla, hace ROLLBACK (la quita) y avisa.
    // A diferencia de `agregarFila` (diferido), NO entra al historial Ctrl+Z y,
    // al confirmarse, la fila pasa al baseline para que ediciones posteriores se
    // diff-een correctamente. Devuelve true/false según el resultado.
    const agregarFilaInmediato = useCallback(async (fila) => {
        const tempId = fila.id ?? crypto.randomUUID()
        const local = { ...fila, id: tempId, id_registro: null, _guardando: true }

        // 1) insert optimista (op local → no resetea baseline ni historial)
        localOpRef.current = true
        const conNueva = [local, ...registrosRef.current]
        registrosRef.current = conNueva
        setRegistros(conNueva)

        try {
            // 2) persistir por debajo
            const res = await services.crear(buildCreatePayload([local]))
            const nuevoId = res?.registros?.[0]?.id ?? null
            const guardada = { ...local, id_registro: nuevoId, _guardando: false }

            localOpRef.current = true
            const finalLista = registrosRef.current.map((r) => (r.id === tempId ? guardada : r))
            registrosRef.current = finalLista
            setRegistros(finalLista)

            // la fila ya guardada entra al baseline (deja de ser "pendiente")
            baselineRef.current = [...(baselineRef.current ?? []), { ...guardada }]
            sync(finalLista)
            return true
        } catch (e) {
            // 3) rollback: quitar la fila optimista
            console.error(e)
            localOpRef.current = true
            const sinNueva = registrosRef.current.filter((r) => r.id !== tempId)
            registrosRef.current = sinNueva
            setRegistros(sinNueva)
            sync(sinNueva)
            onError?.("No se pudo guardar el registro. Se quitó de la lista.")
            return false
        }
    }, [services, buildCreatePayload, setRegistros, sync, onError])

    const copiar = useCallback(() => {
        const seleccion = useSeleccionStore.getState().seleccion
        if (seleccion.size === 0) return
        const rows = registrosRef.current.filter((r) => seleccion.has(idDe(r)))
        if (!rows.length) return
        copiarRegistros(rows)
        limpiarSeleccion()
    }, [copiarRegistros, limpiarSeleccion])

    const pegar = useCallback(() => {
        if (!clipboardRegistros?.length) return
        const nuevos = clipboardRegistros.map(prepararPegado)
        aplicar([...nuevos, ...registrosRef.current])
    }, [clipboardRegistros, prepararPegado, aplicar])

    const guardar = useCallback(async () => {
        if (guardando) return
        const lista = registrosRef.current
        const { toCreate, toUpdate, toDelete } = calcularDiff(lista)
        if (!toCreate.length && !toUpdate.length && !toDelete.length) {
            baselineRef.current = clonar(lista)
            undoRef.current = []
            redoRef.current = []
            setMeta({ puedeDeshacer: false, puedeRehacer: false, hayPendientes: false })
            return
        }
        setGuardando(true)
        try {
            if (toDelete.length) await services.eliminar(toDelete)
            if (toUpdate.length) await services.bulkUpdate(buildUpdatePayload(toUpdate))
            const idsCreados = {}
            if (toCreate.length) {
                const res = await services.crear(buildCreatePayload(toCreate))
                const ids = res?.registros ?? []
                toCreate.forEach((r, i) => { if (ids[i]?.id) idsCreados[r.id] = ids[i].id })
            }
            // Cambio "externo" (localOpRef=false) → el efecto fija nuevo baseline y limpia historial.
            const finalLista = registrosRef.current.map((r) => idsCreados[r.id] ? { ...r, id_registro: idsCreados[r.id] } : r)
            registrosRef.current = finalLista
            localOpRef.current = false
            setRegistros(finalLista)
        } catch (e) {
            console.error(e)
            onError?.("No se pudieron guardar los cambios")
        } finally {
            setGuardando(false)
        }
    }, [guardando, calcularDiff, buildUpdatePayload, buildCreatePayload, services, setRegistros, onError])

    // ── Atajos de teclado (Ctrl+S/Z/Y/C/V) ─────────────────
    const editandoEnInput = () => {
        const el = document.activeElement
        return el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
    }
    const fnRef = useRef({})
    useEffect(() => { fnRef.current = { copiar, pegar, deshacer, rehacer, guardar } })
    useEffect(() => {
        const handler = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return
            const k = e.key.toLowerCase()
            if (k === "s") { e.preventDefault(); e.stopPropagation(); fnRef.current.guardar(); return }
            if (k === "z" && !e.shiftKey) { if (editandoEnInput()) return; e.preventDefault(); e.stopPropagation(); fnRef.current.deshacer(); return }
            if (k === "y" || (k === "z" && e.shiftKey)) { if (editandoEnInput()) return; e.preventDefault(); e.stopPropagation(); fnRef.current.rehacer(); return }
            if (k === "c") { if (editandoEnInput()) return; e.preventDefault(); e.stopPropagation(); fnRef.current.copiar(); return }
            if (k === "v") { if (editandoEnInput()) return; e.preventDefault(); e.stopPropagation(); fnRef.current.pegar(); return }
        }
        document.addEventListener("keydown", handler, true)
        return () => document.removeEventListener("keydown", handler, true)
    }, [])

    const state = {
        listRegistro: registros,
        elementosAEliminar,
        columnasTablaGeneral: columnas,
        activeCell: nav.activeCell,
        activeHeader: nav.activeHeader,
        celdaEditando: nav.celdaEditando,
        guardando: {},
        hayClipboard: clipboardRegistros?.length > 0,
        clipboardRegistros: clipboardRegistros ?? [],
    }

    const handlers = {
        eliminarSeleccionados,
        toggleSeleccion,
        toggleSeleccionTodos,
        actualizarCeldaRegistro,
        setActiveCell: nav.setActiveCell,
        setActiveHeader: nav.setActiveHeader,
        setCeldaEditando: nav.setCeldaEditando,
        iniciarDrag,
        extenderDrag,
        copiar,
        pegar,
        scrollRef,
    }

    const navBundle = {
        celdasTablaRef: nav.celdasTablaRef,
        checkboxMaestroRef: nav.checkboxMaestroRef,
        guardandoRef: nav.guardandoRef,
        moverseEnTablaGeneral: nav.moverseEnTablaGeneral,
    }

    return {
        state, handlers, nav: navBundle,
        agregarFila, agregarFilaInmediato, guardar, deshacer, rehacer, limpiarClipboard,
        guardando, ...meta,
    }
}
