import { z } from "zod"

const numReq = z.preprocess(
  v => (v === "" || v == null ? undefined : Number(v)),
  z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })
)

// Técnico (persona)
export const tecnicoVirginiaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  valor_adicional: numReq,
})

// Config por job
export const configVirginiaSchema = z.object({
  job: z.string().min(1, "Job requerido"),
  porcentaje_tecnico: numReq.refine(v => v > 0, "Debe ser mayor a 0"),
  minimo: numReq,
  cargo_sabados: numReq,
  porcentaje_adicional_empresa: numReq,
})

// Método de pago
export const metodoPagoVirginiaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  trato: z.string().refine(v => ["CASH", "CC"].includes(v), "Debe ser CASH o CC"),
})

// Registro (fila de la tabla) — validación al agregar
export const registroVirginiaSchema = z.object({
  job: z.string().min(1, "Job requerido"),
  job_name: z.string().min(1, "ID Job requerido"),
  valor_servicio: numReq.refine(v => v > 0, "Debe ser mayor a 0"),
  metodo_pago: z.string().min(1, "Método requerido"),
})

export const JOBS_VIRGINIA = ["LOCKOUT", "CAR KEY", "PVT JOBS", "TODO"]
