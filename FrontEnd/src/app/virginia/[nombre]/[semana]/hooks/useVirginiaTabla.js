import { useCallback, useMemo } from "react"
import { useTablaEditable } from "@/app/hooks/useTablaEditable"
import { vaEliminarRegistros, vaEnviarRegistros, vaBulkUpdateRegistros } from "@/Services/virginiaServices"
import { procesarDataVirginia } from "@/Utils/virginiaCalc"
import { columnasVirginia } from "../tableRow/columnasVirginia"

// Campos cuya edición obliga a recalcular el total.
const RECALCULAN = ["valor_servicio", "valor_efectivo", "valor_tarjeta", "tipo_pago", "porcentaje_tecnico", "participacion"]
// Campos que se comparan contra el baseline (diff) y se persisten.
const CAMPOS = ["job", "job_name", "valor_servicio", "metodo_pago", "tipo_pago",
    "valor_efectivo", "valor_tarjeta", "porcentaje_tecnico", "participacion", "subtotal", "total"]

// Envoltorio de Virginia sobre el motor compartido useTablaEditable.
// Solo aporta lo específico de Virginia: cálculo, mapeo de campos y servicios.
export function useVirginiaTabla({ registros, setRegistros, tecnico, semana }) {
    // Los registros de DB no guardan minimo/valor_adicional; procesarDataVirginia los
    // necesita. Se inyectan desde la config del job + el técnico antes de recalcular.
    const conInputsCalculo = useCallback((fila) => {
        const cfg = (tecnico?.configs ?? []).find((c) => c.job === fila.job)
        const adicEmp = cfg?.porcentaje_adicional_empresa ?? fila.porcentaje_adicional_empresa ?? 0
        return {
            ...fila,
            minimo: cfg?.minimo ?? fila.minimo ?? 0,
            valor_adicional: tecnico?.valor_adicional ?? fila.valor_adicional ?? 0,
            porcentaje_adicional_empresa: adicEmp,
            aplica_adicional_empresa: adicEmp > 0 ? "SI" : "NO",
        }
    }, [tecnico])

    const editarCelda = useCallback((filaPrev, colKey, valor) => {
        const fila = { ...filaPrev, [colKey]: valor }
        return RECALCULAN.includes(colKey) ? procesarDataVirginia(conInputsCalculo(fila)) : fila
    }, [conInputsCalculo])

    const prepararPegado = useCallback((r) => {
        const calc = procesarDataVirginia(conInputsCalculo(r))
        return {
            id: crypto.randomUUID(),
            id_registro: null,
            id_tecnico: tecnico?.id ?? r.id_tecnico ?? null,
            nombre: tecnico?.nombre ?? r.nombre ?? "",
            job: calc.job ?? "",
            job_name: calc.job_name ?? "",
            valor_servicio: Number(calc.valor_servicio) || 0,
            metodo_pago: calc.metodo_pago ?? "",
            tipo_pago: calc.tipo_pago ?? "CASH",
            valor_efectivo: Number(calc.valor_efectivo) || 0,
            valor_tarjeta: Number(calc.valor_tarjeta) || 0,
            porcentaje_tecnico: Number(calc.porcentaje_tecnico) || 0,
            participacion: calc.participacion == null ? 100 : Number(calc.participacion),
            subtotal: Number(calc.subtotal) || 0,
            total: Number(calc.total) || 0,
        }
    }, [tecnico, conInputsCalculo])

    const buildCreatePayload = useCallback((rows) => rows.map((r) => ({
        id: String(r.id),
        id_tecnico: tecnico?.id ?? r.id_tecnico ?? null,
        id_registro: null,
        nombre: tecnico?.nombre ?? r.nombre ?? "",
        job: r.job ?? "",
        job_name: r.job_name ?? "",
        valor_servicio: Number(r.valor_servicio) || 0,
        metodo_pago: r.metodo_pago ?? "",
        tipo_pago: r.tipo_pago ?? "CASH",
        valor_tarjeta: Number(r.valor_tarjeta) || 0,
        valor_efectivo: Number(r.valor_efectivo) || 0,
        porcentaje_tecnico: Number(r.porcentaje_tecnico) || 0,
        participacion: r.participacion == null ? 100 : Number(r.participacion),
        subtotal: Number(r.subtotal) || 0,
        total: Number(r.total) || 0,
    })), [tecnico])

    const buildUpdatePayload = useCallback((rows) => rows.map((r) => ({
        id: r.id_registro,
        job: r.job,
        job_name: r.job_name,
        valor_servicio: Number(r.valor_servicio) || 0,
        metodo_pago: r.metodo_pago,
        tipo_pago: r.tipo_pago,
        valor_efectivo: Number(r.valor_efectivo) || 0,
        valor_tarjeta: Number(r.valor_tarjeta) || 0,
        porcentaje_tecnico: Number(r.porcentaje_tecnico) || 0,
        participacion: r.participacion == null ? 100 : Number(r.participacion),
        subtotal: Number(r.subtotal) || 0,
        total: Number(r.total) || 0,
    })), [])

    const services = useMemo(() => ({
        crear: (payload) => vaEnviarRegistros(payload, semana),
        bulkUpdate: (payload) => vaBulkUpdateRegistros(payload),
        eliminar: (rows) => vaEliminarRegistros(rows.map((r) => r.id_registro)),
    }), [semana])

    return useTablaEditable({
        registros, setRegistros,
        columnas: columnasVirginia,
        editarCelda, prepararPegado, camposComparar: CAMPOS,
        buildCreatePayload, buildUpdatePayload, services,
    })
}
