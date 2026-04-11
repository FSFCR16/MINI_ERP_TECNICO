export const columnasTrabajos = [
    {
        key: "check_box",
        label: "",
        hideOn: ["editable"],
        component: "checkbox",
        editable: false
    },
    {
        key: "nombre",
        label: "NOMBRE",
        component: "input",
        inputType: "text",
        editable: true
    },
    {
        key: "job",
        label: "JOB",
        component: "select",
        options: [
            { value: "LOCKOUT",  label: "LOCKOUT"  },
            { value: "CAR KEY",  label: "CAR KEY"  },
            { value: "TODO",     label: "TODO"     },
        ],
        editable: true
    },
    {
        key: "porcentaje_tecnico",
        label: "% TECNICO",
        component: "input",
        inputType: "number",
        editable: true
    },
    {
        key: "porcentaje_cc",
        label: "% CC",
        component: "input",
        inputType: "number",
        editable: true
    },
    {
        key: "minimo",
        label: "MINIMO",
        component: "input",
        inputType: "number",
        editable: true
    },
    {
        key: "adicional_dolar",
        label: "ADICIONAL $",
        component: "input",
        inputType: "number",
        editable: true
    },
    {
        key: "cargo_sabados",
        label: "% SABADOS",
        component: "input",
        inputType: "number",
        editable: true
    },
    {
        key: "porcentaje_adicional_empresa",
        label: "% EMPRESA",
        component: "input",
        inputType: "number",
        editable: true
    },
]