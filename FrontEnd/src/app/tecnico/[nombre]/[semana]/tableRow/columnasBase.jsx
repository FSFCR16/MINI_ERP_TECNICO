export const columnasBase = [
    {
        key: "check_box",
        label: "",
        hideOn: ["editable"],
        component: "checkbox",
        editable: false        // checkbox no se edita
    },

    {
        key: "nombre",
        label: "NOMBRE",
        disableOn: ["editable"],
        component: "input",
        inputType: "text",
        editable: false        // solo lectura — viene del técnico
    },

    {
        key: "job",
        label: "JOB",
        component: ({ data }) =>
            Array.isArray(data) && data.length > 1
            ? "select"
            : "input",
        inputType: "text",
        options: ({ data }) =>
            Array.isArray(data)
            ? data.map(item => ({
                value: item.job,
                label: item.job
            }))
            : [],
        editable: true
    },

    {
        key: "job_name",
        label: "ID JOB",
        component: "input",
        inputType: "text",
        editable: true
    },

    {
        key: "valor_servicio",
        label: "VALOR SERVICIO",
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "tipo_pago",
        label: "TIPO DE PAGO",
        component: "select",
        options: [
            { value: "CASH",  label: "CASH"  },
            { value: "CC",    label: "CC"    },
            { value: "MIXTO", label: "MIXTO" }
        ],
        editable: true
    },

    {
        key: "valor_tarjeta",
        label: "VALOR TARJETA",
        disableOnPago: ["CC", "CASH"],
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "valor_efectivo",
        label: "VALOR EFECTIVO",
        disableOnPago: ["CC", "CASH"],
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "partes_gil",
        label: "PARTES GIL",
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "partes_tecnico",
        label: "PARTES TECNICO",
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "tech",
        label: "TECH",
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "porcentaje_tecnico",
        label: "PORCENTAJE TECNICO",
        component: "input",
        inputType: "number",
        editable: false        // dato del técnico, no debe modificarse por registro
    },

    {
        key: "porcentaje_cc",
        label: "PORCENTAJE CC",
        disableOnPago: ["CASH"],  // ← se oculta en CASH, visible en CC y MIXTO
        component: "input",
        inputType: "number",
        editable: true
    },

    {
        key: "aplica_dolar_empresa",
        label: "DOLAR ADICIONAL POR EMPRESA",
        component: "select",
        options: [
            { value: "NO", label: "NO" },
            { value: "SI", label: "SI" },
        ],
        hideOn: ["general"],
        editable: true
    },

    {
        key: "total",
        label: "TOTAL",
        hideOn: ["editable"],
        component: "input",
        inputType: "number",
        editable: false        // se calcula solo con procesarData
    }
]