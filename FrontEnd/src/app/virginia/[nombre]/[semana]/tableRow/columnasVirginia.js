// Columnas de la tabla de registros de Virginia.
// Misma forma que columnasBase de técnico (la consume TablaRegistros / FilaRegistro):
//   - el índice 0 SIEMPRE es el checkbox de selección (lo dibuja FilaRegistro)
//   - editable:false  → solo lectura
//   - "total" se calcula con procesarDataVirginia, nunca se edita a mano
// A diferencia de la tabla general, NO incluye la columna "CC COMO CASH" (is_cash).
export const columnasVirginia = [
    { key: "check_box",          label: "",          component: "checkbox", editable: false },
    { key: "job",                label: "JOB",       component: "input",    editable: false },
    { key: "job_name",           label: "ID JOB",    component: "input",    inputType: "text",   editable: true  },
    { key: "valor_servicio",     label: "SALES",     component: "input",    inputType: "number", editable: true  },
    { key: "metodo_pago",        label: "MÉTODO",    component: "input",    editable: false },
    { key: "tipo_pago",          label: "TIPO",      component: "input",    editable: true  },
    { key: "valor_efectivo",     label: "EFECTIVO",  component: "input",    inputType: "number", editable: true  },
    { key: "valor_tarjeta",      label: "TARJETA",   component: "input",    inputType: "number", editable: true  },
    { key: "porcentaje_tecnico", label: "% TEC",     component: "input",    inputType: "number", editable: true  },
    { key: "participacion",      label: "% PROPIO",  component: "input",    inputType: "number", editable: true  },
    { key: "total",              label: "TOTAL",     component: "input",    inputType: "number", editable: false },
]
