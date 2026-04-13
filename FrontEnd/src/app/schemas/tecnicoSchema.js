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

    if (Math.round((data.valor_tarjeta + data.valor_efectivo) * 100) !== Math.round(data.valor_servicio * 100)) {

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

export const trabajoSchema = z.object({
    nombre: z.string().min(1, "Requerido"),
    job: z.string().min(1, "Requerido"),
    porcentaje_tecnico: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
    porcentaje_cc: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
    minimo: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
    adicional_dolar: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
    cargo_sabados: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
    porcentaje_adicional_empresa: z.preprocess(v => v === "" ? undefined : Number(v), z.number({ required_error: "Requerido", invalid_type_error: "Requerido" })),
})