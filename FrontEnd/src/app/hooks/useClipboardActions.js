import { useEffect, useCallback } from "react"
import { useClipboardStore } from "../stores/useClipboardStore"
import { envioTablaDB } from "@/Services/tencicosServices.js"
import { procesarData } from "@/Utils/api.js"

export function useClipboardActions({
    listaVisible = [],
    // ── FIX: recibe getSeleccionCopiable (función) en vez de seleccionCopiable (valor reactivo).
    // Antes: seleccionCopiable era s => s.seleccion del store, lo que hacía al padre
    // re-suscribirse al store y re-renderizarse en cada drag.
    // Ahora: getSeleccionCopiable() lee el estado en el momento de copiar (lazy read),
    // sin crear ninguna suscripción reactiva.
    getSeleccionCopiable,
    limpiarSeleccion,
    semana,
    idTecnico,
    nombre,
    setListRegistros,
}) {
    const { clipboardRegistros, copiarRegistros, limpiarClipboard } = useClipboardStore()

    const copiar = useCallback(() => {
        // Lee el Set en el momento exacto de copiar, sin necesidad de tenerlo en estado
        const seleccion = getSeleccionCopiable?.() ?? new Set()

        if (seleccion.size === 0) return

        const rows = listaVisible.filter(r => seleccion.has(r.id_registro ?? r.id))
        if (rows.length === 0) return

        copiarRegistros(rows)
        if (limpiarSeleccion) limpiarSeleccion()
    }, [getSeleccionCopiable, listaVisible, copiarRegistros, limpiarSeleccion])

    const pegar = useCallback(async () => {
        if (!clipboardRegistros || clipboardRegistros.length === 0) return

        const nuevos = clipboardRegistros.map(r => {
            const procesado = procesarData({ ...r })
            return {
                id: crypto.randomUUID(),
                id_registro: null,
                id_tecnico: procesado.id_tecnico ?? null,
                nombre,
                semana,
                job: procesado.job ?? "",
                job_name: procesado.job_name ?? "",
                valor_servicio: procesado.valor_servicio ?? 0,
                porcentaje_tecnico: procesado.porcentaje_tecnico ?? 0,
                minimo: procesado.minimo ?? 0,
                opciones_pago: procesado.opciones_pago ?? [],
                tipo_pago: procesado.tipo_pago ?? "CASH",
                valor_tarjeta: procesado.valor_tarjeta ?? 0,
                valor_efectivo: procesado.valor_efectivo ?? 0,
                porcentaje_cc: procesado.porcentaje_cc ?? 0,
                partes_gil: procesado.partes_gil ?? 0,
                partes_tecnico: procesado.partes_tecnico ?? 0,
                tech: procesado.tech ?? 0,
                subtotal: procesado.subtotal ?? 0,
                total: procesado.total ?? 0,
                is_cash: procesado.is_cash ?? false,
                adicional_dolar: procesado.adicional_dolar ?? 0,
                notas: procesado.notas ?? [],
            }
        })

        setListRegistros(prev => [...nuevos, ...prev])

        try {
            const res = await envioTablaDB(nuevos, semana)
            const idsReales = res?.registros ?? []

            setListRegistros(prev =>
                prev.map(r => {
                    const indexNuevo = nuevos.findIndex(n => n.id === r.id)
                    if (indexNuevo === -1) return r
                    const idReal = idsReales[indexNuevo]?.id
                    return idReal ? { ...r, id_registro: idReal } : r
                })
            )
            limpiarClipboard()
        } catch (err) {
            console.error("Error pegando:", err)
            const idsNuevos = new Set(nuevos.map(n => n.id))
            setListRegistros(prev => prev.filter(r => !idsNuevos.has(r.id)))
        }
    }, [clipboardRegistros, nombre, semana, setListRegistros, limpiarClipboard])

    useEffect(() => {
        const handler = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return
            if (e.key === 'c') { e.preventDefault(); copiar() }
            if (e.key === 'v') { e.preventDefault(); pegar() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [copiar, pegar])

    return { copiar, pegar, clipboardRegistros, hayClipboard: clipboardRegistros?.length > 0 }
}