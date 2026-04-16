import { useEffect, useCallback } from "react"
import { useClipboardStore } from "../stores/useClipboardStore"
// IMPORTANTE: Importa tu store de selección aquí (ajusta la ruta según tu proyecto)
import { useSeleccionStore } from "../stores/useClipboardStore"
import { envioTablaDB } from "@/Services/tencicosServices.js"
import { procesarData } from "@/Utils/api.js"

export function useClipboardActions({
    listaVisible = [],
    // ❌ ELIMINADO: getSeleccionCopiable. Ya no lo pasamos por props.
    limpiarSeleccion,
    semana,
    idTecnico,
    nombre,
    setListRegistros,
}) {
    const { clipboardRegistros, copiarRegistros, limpiarClipboard } = useClipboardStore()

    const copiar = useCallback(() => {
        // ✅ SOLUCIÓN: Zustand .getState() lee la selección exacta al momento de presionar Ctrl+C
        const seleccion = useSeleccionStore.getState().seleccion

        if (seleccion.size === 0) {
            console.log("No hay nada seleccionado para copiar.");
            return;
        }

        // ✅ MEJORA: Validamos ambos IDs. Si guardaste el 'id' local, pero la fila ya 
        // tiene 'id_registro', el Set lo encontrará de todas formas.
        const rows = listaVisible.filter(r => seleccion.has(r.id_registro) || seleccion.has(r.id))
        
        if (rows.length === 0) {
            console.log("No se encontraron las filas en listaVisible.");
            return;
        }

        copiarRegistros(rows)
        console.log("Filas copiadas al portapapeles:", rows);
        
        if (limpiarSeleccion) limpiarSeleccion()
    }, [listaVisible, copiarRegistros, limpiarSeleccion])

    const pegar = useCallback(async () => {
        // (Tu código de pegar se mantiene exactamente igual, está perfecto)
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
            
            // ✅ MEJORA: toLowerCase() evita que falle si el usuario tiene Bloq Mayús activado.
            if (e.key.toLowerCase() === 'c') { 
                e.preventDefault()
                copiar() 
            }
            if (e.key.toLowerCase() === 'v') { 
                e.preventDefault()
                pegar() 
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [copiar, pegar])

    return { copiar, pegar, clipboardRegistros, hayClipboard: clipboardRegistros?.length > 0 }
}