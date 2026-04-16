export const modalConfig = {
    "FINALIZAR": {
        title: "TABLA FINALIZADA",
        message: "Verifique que la información sea correcta antes de finalizar.",
        confirmText: "ACEPTAR",
        cancelText: "CANCELAR",
        hasFunction: true,
        showBtn: true,
        modalRender: 1,
    },
    "EXPORTAR": {
        title: "EXPORTAR A EXCEL",
        message: "Verifique la información antes de exportar.",
        confirmText: "EXPORTAR",
        cancelText: "CANCELAR",
        modalRender: 1,
        showBtn: true,
        hasFunction: true,
    },
    "NOTAS": {
        title: "NOTAS DEL TECNICO",
        cancelText: "CANCELAR",
        modalRender: 2,
        showBtn: false
    },
    "ERROR": {
        title: "CAMPOS FALTANTES",
        cancelText: "CANCELAR",
        modalRender: 2,
        showBtn: false,
    },
    "SIN_REGISTROS": {
        title: "SIN REGISTROS",
        message: "No hay registros para exportar la tabla a un excel, por favor agregue registros para continuar",
        cancelText: "CANCELAR",
        modalRender: 1,
        showBtn: false,
    },
    "REGISTROS_NO_GUARDADOS": {
        title: "REGISTROS SIN GUARDAR",
        message: "Hay registros que todavia no han sido guardados, ¿Desea continuar?",
        confirmText: "CONTINUAR",
        cancelText: "CANCELAR",
        showBtn: true,
        modalRender: 1,
        hasFunction: true,
    },
    "HISTORIAL": {
        title: "HISTORIAL DEL TECNICO",
        modalRender: 3,
    },
    "AUTO_MESSAGE": {
        title: "AUTO COMPLETE MENSAJE",
        modalRender: 4
    },
    "CAMPOS_FALTANTES": {
        title: "DATOS FALTANTES",
        modalRender: 5
    },
    // Nuevas configuraciones agregadas para los modales de eliminación:
    "ELIMINAR_SEMANA": {
        title: "ELIMINAR SEMANA",
        message: "¿Estás seguro de que deseas eliminar esta semana? Esta acción no se puede deshacer.",
        confirmText: "ELIMINAR",
        cancelText: "CANCELAR",
        showBtn: true,
        modalRender: 1,
        hasFunction: true,
    },
    "ELIMINAR_TECNICO": {
        title: "ELIMINAR TÉCNICO",
        message: "¿Estás seguro de que deseas eliminar a este técnico? Se borrarán sus registros de esta semana.",
        confirmText: "ELIMINAR",
        cancelText: "CANCELAR",
        showBtn: true,
        modalRender: 1,
        hasFunction: true,
    }
}

export function getModalEntry(tipo, { finalizarTabla, exportarExcelDB, notas, errores } = {}) {
    const base = modalConfig[tipo]
    if (!base) return null

    const dinamico = {}

    if (tipo === "NOTAS") dinamico.message = notas
    if (tipo === "ERROR") dinamico.message = errores

    // Mapeamos las nuevas acciones al prop "finalizarTabla" 
    // (que es donde Page.js está enviando la 'accionPendiente')
    const funcionesPorTipo = {
        "FINALIZAR": finalizarTabla,
        "EXPORTAR": exportarExcelDB,
        "REGISTROS_NO_GUARDADOS": exportarExcelDB,
        "ELIMINAR_SEMANA": finalizarTabla, 
        "ELIMINAR_TECNICO": finalizarTabla,
    }

    if (funcionesPorTipo[tipo]) {
        dinamico.functionName = () => funcionesPorTipo[tipo]()
    }

    return { ...base, ...dinamico }
}