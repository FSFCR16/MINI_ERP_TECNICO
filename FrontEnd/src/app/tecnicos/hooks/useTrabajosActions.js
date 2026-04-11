import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { obtenerTrabajos, crearTrabajo, actualizarTrabajo, eliminarTrabajo } from "../../../Services/tencicosServices"
import { columnasTrabajos } from "../table/columnasTrabajos.js"
import { trabajoSchema } from "@/app/schemas/tecnicoSchema"

const rowVacio = {
    nombre: "",
    job: "LOCKOUT",
    porcentaje_tecnico: 0,
    porcentaje_cc: 4,
    minimo: 30,
    adicional_dolar: 1,
    cargo_sabados: 0,
    porcentaje_adicional_empresa: 0,
}

export function useTrabajosActions({ openError, openModal, closeModal, pedirConfirmacion }) {

    const [trabajos, setTrabajos] = useState([])
    const [rowData, setRow] = useState({ ...rowVacio })
    const [loading, setLoading] = useState(true)
    const [elementosAEliminar, setElementosAEliminar] = useState([])
    const [guardando, setGuardando] = useState(false)
    const [haycambiosPendientes, setHayCambiosPendientes] = useState(false)

    // ✅ Ref para que guardarCambios siempre vea trabajos fresco
    const trabajosRef = useRef(trabajos)
    useEffect(() => { trabajosRef.current = trabajos }, [trabajos])

    const openModalRef = useRef(openModal)
    useEffect(() => { openModalRef.current = openModal }, [openModal])

    // ── Cargar trabajos ───────────────────────────────────────
    useEffect(() => {
        const cargar = async () => {
            setLoading(true)
            try {
                const data = await obtenerTrabajos()
                setTrabajos(data)
            } catch (err) {
                console.error("Error cargando técnicos:", err)
            } finally {
                setLoading(false)
            }
        }
        cargar()
    }, [])

    // ── Columnas ──────────────────────────────────────────────
    const buildColumns = (tipoTabla) =>
        columnasTrabajos
            .map(col => ({
                ...col,
                visible: !col.hideOn?.includes(tipoTabla),
                disabled: col.disableOn?.includes(tipoTabla),
            }))
            .filter(c => c.visible)

    const columnasTablaGeneral  = useMemo(() => buildColumns("general"),  [])
    const columnasTablaEditable = useMemo(() => buildColumns("editable"), [])

    // ── Selección ─────────────────────────────────────────────
    const toggleSeleccion = (item) =>
        setElementosAEliminar(prev =>
            prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
        )

    const toggleSeleccionTodos = () =>
        setElementosAEliminar(
            elementosAEliminar.length === trabajos.length ? [] : [...trabajos]
        )

    // ── Validación ────────────────────────────────────────────
    const mapearErroresZod = (error) =>
        error.issues.map(issue => ({
            label: issue.path[0].replaceAll("_", " ").toUpperCase(),
            message: issue.message,
            key: issue.path[0],
        }))

    // ── Agregar ───────────────────────────────────────────────
    const handleBtnAgregar = async () => {
        const resultado = trabajoSchema.safeParse(rowData)
        if (!resultado.success) {
            openError(mapearErroresZod(resultado.error))
            return
        }

        const payload = {
            ...rowData,
            nombre: rowData.nombre.trim().toUpperCase(),
            porcentaje_gil: Math.round((100 - rowData.porcentaje_tecnico) * 100) / 100,
        }

        const nuevoLocal = { ...payload, id: `temp-${crypto.randomUUID()}` }
        setTrabajos(prev => [...prev, nuevoLocal])
        setRow({ ...rowVacio })

        try {
            const creado = await crearTrabajo(payload)
            // ✅ creado ya trae el id real del backend
            setTrabajos(prev =>
                prev.map(t => t.id === nuevoLocal.id ? creado : t)
            )
        } catch (err) {
            console.error("Error creando técnico:", err)
            setTrabajos(prev => prev.filter(t => t.id !== nuevoLocal.id))
        }
    }

    // ── Eliminar ──────────────────────────────────────────────
    const eliminarSeleccionados = async () => {
        const idsReales = elementosAEliminar.filter(t => !String(t.id).startsWith("temp-"))
        setTrabajos(prev => prev.filter(t => !elementosAEliminar.includes(t)))
        setElementosAEliminar([])
        try {
            await Promise.all(idsReales.map(t => eliminarTrabajo(t.id)))
        } catch (err) {
            console.error("Error eliminando:", err)
        }
    }

    // ── Editar celda — solo estado local, sin llamada a DB ────
    const actualizarCeldaTrabajo = (rowIndex, colKey, nuevoValor) => {
        setTrabajos(prev => {
            const copia = [...prev]
            copia[rowIndex] = { ...copia[rowIndex], [colKey]: nuevoValor }
            return copia
        })
        setHayCambiosPendientes(true)
    }

    // ── Guardar manual — Ctrl+S o botón ──────────────────────
    const guardarCambios = useCallback(async () => {
        const reales = trabajosRef.current.filter(t => !String(t.id).startsWith("temp-"))
        if (!reales.length) return

        setGuardando(true)
        try {
            await Promise.all(reales.map(t => actualizarTrabajo(t.id, t)))
            setHayCambiosPendientes(false)
        } catch (err) {
            console.error("Error guardando:", err)
            openModalRef.current("ERROR_GUARDADO")
        } finally {
            setGuardando(false)
        }
    }, [])

    return {
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
        guardarCambios,
        haycambiosPendientes,
        guardando,
    }
}