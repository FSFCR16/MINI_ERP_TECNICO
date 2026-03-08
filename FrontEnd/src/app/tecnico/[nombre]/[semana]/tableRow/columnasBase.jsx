export const columnasBase = [
        {
        key: "check_box",
        label: "",
        hideOn: ["editable"],
        component: "checkbox"
        },

        {
        key: "nombre",
        label: "NOMBRE",
        disableOn: ["editable"],
        component: "input",
        inputType: "text"
        },

        {
        key: "job",
        label: "JOB",

        // decide si renderiza select o input
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
            : []
        },

        {
        key: "job_name",
        label: "ID JOB",
        component: "input",
        inputType: "text"
        },

        {
        key: "valor_servicio",
        label: "VALOR SERVICIO",
        component: "input",
        inputType: "number"
        },

        {
        key: "tipo_pago",
        label: "TIPO DE PAGO",
        component: "select",

        options: [
            { value: "CASH", label: "CASH" },
            { value: "CC", label: "CC" },
            { value: "MIXTO", label: "MIXTO" }
        ]
        },

        {
        key: "valor_tarjeta",
        label: "VALOR TARJETA",
        disableOnPago: ["CC", "CASH"],
        component: "input",
        inputType: "number"
        },

        {
        key: "valor_efectivo",
        label: "VALOR EFECTIVO",
        disableOnPago: ["CC", "CASH"],
        component: "input",
        inputType: "number"
        },

        {
        key: "partes_gil",
        label: "PARTES GIL",
        component: "input",
        inputType: "number"
        },

        {
        key: "partes_tecnico",
        label: "PARTES TECNICO",
        component: "input",
        inputType: "number"
        },

        {
        key: "tech",
        label: "TECH",
        component: "input",
        inputType: "number"
        },

        {
        key: "porcentaje_tecnico",
        label: "PORCENTAJE TECNICO",
        component: "input",
        inputType: "number"
        },

        {
        key: "porcentaje_cc",
        label: "PORCENTAJE CC",
        component: "input",
        inputType: "number"
        },

        {
        key: "aplica_dolar_empresa",
        label: "DOLAR ADICIONAL POR EMPRESA",
        component: "select",
        options: [
            { value: "NO", label: "NO" },
            { value: "SI", label: "SI" },
        ],
        hideOn: ["general"]
        },

        {
        key: "total",
        label: "TOTAL",
        hideOn: ["editable"],
        component: "input",
        inputType: "number"
        }


];