export const configModal = {
        "FINALIZAR":{
            title:"TABLA FINALIZADA",
            message:"Verifique que la información sea correcta antes de finalizar.",
            confirmText: "ACEPTAR",
            cancelText: "CANCELAR",
            hasFunction:true,
            showBtn:true,
            modalRender:1,
            functionName:() => finalizarTabla()
        },
        "EXPORTAR":{
            title:"EXPORTAR A EXCEL",
            message:"Verifique la información antes de exportar.",
            confirmText: "EXPORTAR",
            cancelText: "CANCELAR",
            modalRender:1,
            showBtn:true,
            hasFunction:true,
            functionName: () => exportarExcelDB()
        },
        "NOTAS":{
            title:"NOTAS DEL TECNICO",
            message:notas,
            cancelText: "CANCELAR",
            modalRender:2,
            showBtn:false
        },
        "ERROR":{
            title:"CAMPOS FALTANTES",
            message:erroresCampos,
            cancelText: "CANCELAR",
            modalRender:2,
            showBtn:false,
        },
        "SIN_REGISTROS":{
            title:"SIN REGISTROS",
            message:"No hay registros para exportar la tabla a un excel, por favor agregue registros para continuar",
            cancelText: "CANCELAR",
            modalRender:1,
            showBtn:false,
        },
        "REGISTROS_NO_GUARDADOS":{
            title:"REGISTROS SIN GUARDAR",
            message:"Hay registros que todavia no han sido guardados, ¿Desea continuar?",
            confirmText: "CONTINUAR",
            cancelText: "CANCELAR",
            showBtn:true,
            modalRender:1,
            hasFunction:true,
            functionName:() => exportarExcelDB()
        },
        "HISTORIAL":{
            title:"HISTORIAL DEL TECNICO",
            modalRender:3,
        },
        "ELIMINAR_SEMANA":{
            title:"ELIMINAR SEMANA",
            message:"Esta acción eliminará todos los registros de la semana. ¿Desea continuar?",
            confirmText:"ELIMINAR",
            cancelText:"CANCELAR",
            showBtn:true,
            modalRender:1,
            hasFunction:true,
            functionName:() => {}
        },

        "ELIMINAR_TECNICO":{
            title:"ELIMINAR REGISTROS",
            message:"Se eliminarán todos los registros del técnico en esta semana.",
            confirmText:"ELIMINAR",
            cancelText:"CANCELAR",
            showBtn:true,
            modalRender:1,
            hasFunction:true,
            functionName:() => {}
        },
}