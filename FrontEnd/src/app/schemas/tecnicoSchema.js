import { z } from "zod"

export const tecnicoSchema = z.object({
  id: z.string(),
  id_tecnico: z.coerce.number(),
  nombre: z.string().min(1, "Nombre requerido"),
  job: z.string().min(1),
  job_name: z.string().min(1, "Debe escribir el nombre del trabajo"),
  porcentaje_tecnico: z.coerce
    .number()
    .gt(0, "El porcentaje del técnico debe ser mayor a 0"),
  valor_servicio: z.coerce
    .number()
    .gt(0, "El valor del servicio debe ser mayor a 0"),
  minimo: z.coerce.number(),
  tipo_pago: z
    .string()
    .refine(val => ["CASH", "CC", "MIXTO"].includes(val), {
        message: "Debe seleccionar una forma de pago válida"
    }),
  valor_tarjeta: z.coerce.number(),
  valor_efectivo: z.coerce.number(),
  porcentaje_cc: z.coerce.number(),
  subtotal: z.coerce.number(),
  total: z.coerce.number()
}).superRefine((data, ctx) => {

  if (data.tipo_pago === "MIXTO") {

    if (!data.valor_efectivo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe ingresar valor en efectivo",
        path: ["valor_efectivo"]
      })
    }

    if (!data.valor_tarjeta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe ingresar valor en tarjeta",
        path: ["valor_tarjeta"]
      })
    }

    if ((data.valor_tarjeta + data.valor_efectivo) !== data.valor_servicio) {

    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La suma debe ser igual al valor del servicio",
        path: ["valor_tarjeta"]
    });

    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La suma debe ser igual al valor del servicio",
        path: ["valor_efectivo"]
    });

    }
  }

})