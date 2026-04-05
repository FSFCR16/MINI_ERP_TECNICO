"use client"
import { DialogPanel, Transition, TransitionChild, Dialog } from '@headlessui/react'
import { useEffect, useState, useRef } from "react"
import { Fragment } from "react";
import { useParams } from "next/navigation"
import { confirmarTecnico, ValidarSemanaTecnico,envioTablaDB,getRegistrosPrevios,eleiminarRegistrosDb,exportarExcelDBPost } from "../../../../Services/tencicosServices.js"
import { procesarDatosTecnico,procesarData,formatearFechaSemana, formatearNumero} from "../../../../Utils/api.js"
import {MobileView} from "./components/MobileView.jsx";
import { tecnicoSchema } from '@/app/schemas/tecnicoSchema.js';
import { ContentList } from '../../components_modal/content_list.jsx';
import { ContentNoList } from '../../components_modal/content_noList.jsx';
import { LoadingOverlay } from '@/Components/loadingOverlay.jsx';
import { columnasBase } from './tableRow/columnasBase.jsx';
import { CellRenderer } from './tableRow/renderCell.jsx';
import { ModalHistorial } from '../../components_modal/contentModalHistorial.jsx';
import { ModalAutoMessage } from "../../../tecnico/components_modal/messageModal.jsx"
import { ModalCamposFaltantes } from "../../../tecnico/components_modal/modalCamposFatantes.jsx"
export default function Page() {

    const { nombre, semana} = useParams();
    const [erroresCampos, setErroresCampos] = useState([])
    const columnasDeshabilitdasGenerales = ["nombre"]
    const [isOpen, setIsOpen] = useState(false)
    const [data, setData] = useState([]);
    const [elementosAEliminar, setElementosAEliminar] = useState([]);
    const [rowData, setRow] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listRegistro, setListRegistros] = useState([])
    const [dataPersistenteModificada, setDatModificada] = useState({})
    const [modalTipo, setModalTipo] = useState("")
    const [isMobile, setIsMobile] = useState(false);
    const [notas, setNotas] = useState([]);
    const inputsReferencias = useRef([])
    const [registrosLocalStroge, setRegistrosLocalStorage] = useState([])
    const [activeCell, setActiveCell] = useState(null)
    const [activeHeader, setActiveHeader] = useState(null)
    const [fechaInicio, setfechaInicio] = useState("")
    const [fechaFin, setfechaFin] = useState("")
    const [resultadoParcial, setResultadoParcial] = useState(null)
    const [camposFaltantes, setCamposFaltantes] = useState([])
    const celdasTablaRef = useRef({})
    const checkboxMaestroRef = useRef(null)
    const [celdaEditando, setCeldaEditando] = useState(null)
    const guardandoRef = useRef(false)

    const configModal = {
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
            "AUTO_MESSAGE":{
                title:"AUTO COMPLETE MENSAJE",
                modalRender:4
            },
            "CAMPOS_FALTANTES": {
                title: "DATOS FALTANTES",
                modalRender: 5
}
    }
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            try {
                const registrosLocalStorage = JSON.parse(localStorage.getItem(`registrosTemporales_${nombre}_${semana}`)) || []
                setRegistrosLocalStorage(registrosLocalStorage)

                const semanaFecha = await ValidarSemanaTecnico(semana);
                const fechaInicio = formatearFechaSemana(semanaFecha.fecha_inicio)
                const fechaFin = formatearFechaSemana(semanaFecha.fecha_fin)
                
                setfechaInicio(fechaInicio)
                setfechaFin(fechaFin)

                const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(err => {
                    console.warn("No se pudieron obtener los registros previos:", err.message);
                    return []
                });
                const infoTecnico = await confirmarTecnico(nombre);
                const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                    procesarDatosTecnico(infoTecnico,dato)
                );

                console.log(dataPreviaProcesada)
                const registrosCompletos = [...dataPreviaProcesada, ...registrosLocalStorage]
                // Limpiar estado antes de actualizar
                console.log(registrosCompletos)
                setListRegistros([]); 
                setListRegistros(registrosCompletos);
                setData(infoTecnico || []);
            } catch (err) {
                console.error("ERROR DETALLADO:", err.message, err)  // ← ver el error real
                setError("No se pudo validar la semana o cargar la información.");
            } finally {
                setLoading(false);
            }
        };

        if (nombre) {
            cargarDatos();
        }

    }, [nombre]);
    useEffect(() => {
        let base = {}
        if (!data || data.length === 0) {
            setRow({});
            return;
        }

        base = procesarDatosTecnico(data[0])

        setRow(base);
        setNotas(base?.notas)
        setDatModificada(base)

    }, [data]);

    if (error) {
        return (
            <div className="w-full flex justify-center">
                <div
                    className="
                    w-full max-w-2xl
                    bg-white/60 backdrop-blur-xl
                    border border-red-300/40
                    rounded-3xl
                    shadow-2xl
                    px-10 py-16
                    text-center
                    "
                >
                    <p className="text-red-600 font-medium text-lg">
                    {error}
                    </p>
                </div>
            </div>
        );
    }
    const tieneError = (columna) => {
        return erroresCampos.some(e => e.key === columna);
    }

    const mapearErroresZod= (error)  => {
        const errores = []
        error.issues.forEach(issue => {
            const campo = `${issue.path[0].replaceAll("_", " ").toUpperCase()}: ${issue.message}`
            const objectError= {
                "label":issue.path[0].replaceAll("_", " ").toUpperCase(),
                "message": issue.message,
                "key":issue.path[0]
            }
            errores.push(objectError)
        })

        return errores
    }

    const handleBtnAgregar = () => {
        const rowCopy = procesarData({ ...rowData })
        const id = crypto.randomUUID()
        rowCopy.id = id
        const resultado = tecnicoSchema.safeParse(rowCopy)
        if (!resultado.success) {

            const errores = mapearErroresZod(resultado.error)
            setErroresCampos(errores)
            setModalTipo("ERROR")
            setIsOpen(true)
            return
        }
        
        if(rowCopy.tipo_pago === "CC" || rowCopy.tipo_pago === "CASH" ){
            rowCopy.valor_tarjeta = 0
            rowCopy.valor_efectivo = 0
        }
        
        setErroresCampos([])
        setListRegistros(prev => [...prev,rowCopy])
        setRegistrosLocalStorage(prev => [...prev, rowCopy])
        setRow(procesarDatosTecnico(data[0]))
        localStorage.setItem(`registrosTemporales_${nombre}_${semana}`, JSON.stringify(registrosLocalStroge))
    }

    const moverseEntreCeldas = (e, colIndex) => {
        if (e.target.tagName === "SELECT") {
            e.preventDefault();
        }
        if (e.key === "ArrowRight") {
            inputsReferencias.current[0][colIndex + 1]?.focus();
        }
        if (e.key === "ArrowLeft") {
            inputsReferencias.current[0][colIndex - 1]?.focus();
        }
    }

    const moverseEnTablaGeneral = (e, rowIndex, colIndex) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            celdasTablaRef.current[`${rowIndex + 1}-${colIndex}`]?.focus()
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            celdasTablaRef.current[`${rowIndex - 1}-${colIndex}`]?.focus()
        }
        if (e.key === "ArrowRight") {
            e.preventDefault()
            celdasTablaRef.current[`${rowIndex}-${colIndex + 1}`]?.focus()
        }
        if (e.key === "ArrowLeft") {
            e.preventDefault()
            celdasTablaRef.current[`${rowIndex}-${colIndex - 1}`]?.focus()
        }
    }
    const columns = (rowData = {}, tipoTabla) => {
        return columnasBase
            .map(col => ({
                ...col,
                visible: (!col.hideOn?.includes(tipoTabla) && !col.disableOnPago?.includes(rowData.tipo_pago)),
                disabled: !col.disableOn?.includes(tipoTabla)
            }))
            .filter(c => c.visible);
    }
    const columnasTablaEditable = columns(rowData, "editable");
    const columnasTablaGeneral = columns({}, "general");

    const toggleSeleccion = (dataEliminar) => {
        setElementosAEliminar(prev =>
            prev.includes(dataEliminar)
            ? prev.filter(e => e !== dataEliminar)
            : [...prev, dataEliminar]
        );
    };

    const eliminarSeleccionados = async () => {
        setListRegistros(
            listRegistro.filter(d => !elementosAEliminar.includes(d))
        );
        setRegistrosLocalStorage(
            registrosLocalStroge.filter(d => !elementosAEliminar.includes(d))
        );
        await eleiminarRegistrosDb(elementosAEliminar.filter(datos => datos.id_registro))
        setElementosAEliminar([]);
    }

    const finalizarTabla = async () => {
        setIsOpen(false)
        setLoading(true)
        try {
            const registrosFiltrados = listRegistro.filter(
            reg => reg.id_registro === null || reg.id_registro === undefined || reg.id_registro === ''
            )
            console.log(registrosFiltrados, listRegistro)
            const resultado = await envioTablaDB(registrosFiltrados, semana)

            const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(err => {
                console.warn("No se pudieron obtener los registros previos:", err.message);
                return []
            });
            const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                    procesarDatosTecnico(data,dato)
            );
            setListRegistros(dataPreviaProcesada)

        } catch (error) {
            console.error("Error:", error)
        }
        localStorage.removeItem(`registrosTemporales_${nombre}_${semana}`)
        setRegistrosLocalStorage([])
        setLoading(false)
    }

    const clickExportExcel = () => {
        setIsOpen(true)
        if(listRegistro.length === 0){
            setModalTipo("SIN_REGISTROS")
            setIsOpen(true)
            return
        }
        if(registrosLocalStroge.length >=1){
            setModalTipo("REGISTROS_NO_GUARDADOS")
            setIsOpen(true)
            return
        }
        setModalTipo("EXPORTAR")
    }

    const exportarExcelDB = async () => {
        try {
            setIsOpen(false)
            setLoading(true)
            const regustrosGuardados = listRegistro.filter(e => (e.id_registro))
            if(!regustrosGuardados.length){
                setModalTipo("SIN_REGISTROS")
                setIsOpen(true)
                return
            }
            const response = await exportarExcelDBPost(regustrosGuardados,nombre,semana);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${nombre}_${semana}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            console.log("Exportando registros:", regustrosGuardados)

        } catch (error) {
            console.error("Error exportando:", error)
        }finally{
            setLoading(false)
        }
    }

    const baseRef = (index, el) => {
        if (!inputsReferencias.current[0]) {
            inputsReferencias.current[0] = [];
        }
        inputsReferencias.current[0][index] = el;
    };

    function procesarMensaje(result) {
        try {   
            console.log(result)
            setRow(prev => {
                let newRow = { ...prev }
                let found;
                if (result.job_name)
                    newRow.job_name = result.job_name.toUpperCase()

                if(data[0].job !== "TODO"){
                    if (result.job_type && ["LOCKOUT", "CARKEY"].includes(result.job_type.replace(/\s+/g, "")))
                        newRow.job = result.job_type.toUpperCase()
                    found = data.find((d) => d.job.replace(/\s+/g, "") === result.job_type.replace(/\s+/g, ""));
                    console.log(data,found)
                }

                if (result.valor_servicio)
                    newRow.valor_servicio = result.valor_servicio

                if (result.valor_efectivo)
                    newRow.valor_efectivo = result.valor_efectivo

                if (result.valor_tarjeta)
                    newRow.valor_tarjeta = result.valor_tarjeta

                if (result.parts_tecnico)
                    newRow.partes_tecnico = result.parts_tecnico
                
                if (result.parts_gil)
                    newRow.partes_gil = result.parts_gil

                if (result.tipo_pago)
                    newRow.tipo_pago = result.tipo_pago.toUpperCase()
                
                console.log(found)
                if(data.length>1) return procesarDatosTecnico([found], newRow, true)[0]
                return procesarDatosTecnico(data, newRow, true)[0]
            })

        } catch (err) {
            console.error(err)
            setError("No se pudo interpretar el mensaje")
        }
    }

    const actualizarCeldaRegistro = (rowIndex, colKey, nuevoValor) => {
        setListRegistros(prev => {
            const copia = [...prev]
            // Fusionar el nuevo valor sobre la fila completa
            const filaActualizada = { ...copia[rowIndex], [colKey]: nuevoValor }

            const camposQueRecalculan = [
                "valor_servicio",
                "valor_efectivo", 
                "valor_tarjeta",
                "partes_gil",
                "partes_tecnico",
                "tech",
                "tipo_pago",
                "aplica_dolar_empresa",
                "adicional_dolar",
                "porcentaje_tecnico",
                "porcentaje_cc"
            ]

            if (camposQueRecalculan.includes(colKey)) {
                // procesarData recibe el objeto completo — tiene minimo, porcentajes, etc.
                copia[rowIndex] = procesarData({ ...filaActualizada })
            } else {
                copia[rowIndex] = filaActualizada
            }

            return copia
        })
    }
    const toggleSeleccionTodos = () => {
        if (elementosAEliminar.length === listRegistro.length) {
            setElementosAEliminar([])
        } else {
            setElementosAEliminar([...listRegistro])
        }
    }
    return (
    <>
        {loading && <LoadingOverlay />}
        {isMobile ? (
            <MobileView
                listRegistro={listRegistro}
                columnas={columnasTablaGeneral}
                columnasTablaEditable={columnasTablaEditable}
                columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                rowData={rowData}
                setRow={setRow}
                data={data}
                moverseEntreCeldas={moverseEntreCeldas}
                handleBtnAgregar={handleBtnAgregar}
                toggleSeleccion={toggleSeleccion}
                elementosAEliminar={elementosAEliminar}
                eliminarSeleccionados={eliminarSeleccionados}
                setIsOpen={setIsOpen}
                setModalTipo={setModalTipo}
                tieneError={tieneError}
                baseRef={baseRef}
                procesarDatosTecnico={procesarDatosTecnico}
                setNotas={setNotas}
                isMobile={isMobile}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                nombre={nombre}
            />
        ) : (
        <div className="h-screen w-full flex justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">

            <div className="w-full max-w-[1250px] flex flex-col gap-4 h-full">

                {/* ===================== HEADER INFO TÉCNICO ===================== */}
                <div className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">

                    {/* Izquierda — técnico + semana como pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">
                            Técnico
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                            {nombre}
                        </span>
                        <span className="text-slate-300 select-none">·</span>
                        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/60 border border-white/50 text-slate-500 uppercase tracking-wide">
                            Semana
                        </span>
                        <span className="text-sm text-slate-600">
                            {fechaInicio} / {fechaFin} {new Date().getFullYear()}
                        </span>
                    </div>

                    {/* Derecha — HISTORIAL */}
                    <button
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl
                        bg-white/50 backdrop-blur-xl border border-white/50
                        text-amber-600 font-medium shadow-sm
                        hover:bg-white/70 active:scale-95 transition-all duration-200 cursor-pointer"
                        onClick={() => {
                            setIsOpen(true)
                            setModalTipo("HISTORIAL")
                        }}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Historial
                    </button>

                </div>
                {/* ===================== TABLA SUPERIOR — REGISTROS ===================== */}
                <section className="w-full flex-1 min-h-0 overflow-hidden rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border border-white/40 flex flex-col">

                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/40">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Registros
                            </span>
                            {listRegistro.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-600 border border-indigo-200/60">
                                    {listRegistro.length}
                                </span>
                            )}
                        </div>
                        {elementosAEliminar.length > 0 && (
                            <button
                                className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-xl
                                bg-rose-50/80 border border-rose-200/60
                                text-rose-500 font-medium
                                hover:bg-rose-100/80 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={eliminarSeleccionados}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Eliminar {elementosAEliminar.length}
                            </button>
                        )}
                    </div>

                    <div className="w-full flex-1 overflow-auto custom-scroll">
                        <table className="w-full border-collapse table-fixed">

                            <thead className="bg-white/60 backdrop-blur-md text-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-1 py-1 border-b border-white/40 text-center" style={{ width: "32px" }}>
                                        <input
                                            ref={checkboxMaestroRef}
                                            type="checkbox"
                                            className="w-3.5 h-3.5 cursor-pointer"
                                            checked={listRegistro.length > 0 && elementosAEliminar.length === listRegistro.length}
                                            onChange={toggleSeleccionTodos}
                                        />
                                    </th>
                                    {columnasTablaGeneral.map((col, i) => {
                                        if (i === 0) return null
                                        const headerKey = `header-${i}`
                                        return (
                                            <th
                                                key={col.key}
                                                className="px-1 py-1 text-[10px] font-semibold border-b border-white/40 text-center cursor-pointer hover:bg-white/40 transition"
                                                style={{ width: "auto" }}
                                                onClick={() => setActiveHeader(activeHeader === headerKey ? null : headerKey)}
                                            >
                                                <div className="w-full overflow-hidden whitespace-nowrap">
                                                    <span className={`block w-full ${activeHeader === headerKey ? "animate-scrollText" : "truncate"}`}>
                                                        {col.label}
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {listRegistro.map((row, indexrow) => (
                                    <tr
                                        key={indexrow}
                                        className={`transition duration-200 hover:bg-white/40
                                        ${elementosAEliminar.includes(row) ? "bg-blue-50/60" : ""}
                                        `}
                                    >
                                        {columnasTablaGeneral.map((col, indexCol) => {
                                            const cellKey    = `${indexrow}-${indexCol}`
                                            const value      = row[col.key]
                                            const isTotal    = col.key === "total"
                                            const esEditable = col.editable !== false

                                            return (
                                                <td
                                                    key={indexCol}
                                                    className={`px-1 py-1 border-b border-white/30
                                                    ${indexCol === 0 ? "text-center w-[32px]" : "text-right"}
                                                    `}
                                                >
                                                    {indexCol === 0 ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={elementosAEliminar.includes(row)}
                                                            onChange={() => toggleSeleccion(row)}
                                                            className="w-3.5 h-3.5 cursor-pointer"
                                                        />

                                                    ) : celdaEditando === cellKey ? (
                                                        <input
                                                            autoFocus
                                                            type={Number.isFinite(value) ? "number" : "text"}
                                                            defaultValue={value}
                                                            className="w-full text-[12px] bg-white/80 border border-indigo-300/60 rounded px-1 outline-none"
                                                            onBlur={(e) => {
                                                                // ✅ Si ya se guardó desde keydown, no guardar dos veces
                                                                if (guardandoRef.current) {
                                                                    guardandoRef.current = false
                                                                    return
                                                                }
                                                                const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                                                actualizarCeldaRegistro(indexrow, col.key, val)
                                                                setCeldaEditando(null)
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Escape") {
                                                                    guardandoRef.current = true
                                                                    e.target.blur()
                                                                    setCeldaEditando(null)
                                                                    return
                                                                }
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault()
                                                                    guardandoRef.current = true
                                                                    const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                                                    actualizarCeldaRegistro(indexrow, col.key, val)
                                                                    setCeldaEditando(null)
                                                                    setTimeout(() => {
                                                                        celdasTablaRef.current[`${indexrow + 1}-${indexCol}`]?.focus()
                                                                    }, 0)
                                                                    return
                                                                }
                                                                if (e.key === "Tab") {
                                                                    e.preventDefault()
                                                                    guardandoRef.current = true
                                                                    const val = Number.isFinite(value) ? Number(e.target.value) : e.target.value
                                                                    actualizarCeldaRegistro(indexrow, col.key, val)
                                                                    setCeldaEditando(null)
                                                                    setTimeout(() => {
                                                                        celdasTablaRef.current[`${indexrow}-${indexCol + 1}`]?.focus()
                                                                    }, 0)
                                                                    return
                                                                }
                                                            }}
                                                            ref={el => { celdasTablaRef.current[cellKey] = el }}
                                                        />

                                                    ) : (
                                                        <div
                                                            tabIndex={0}
                                                            onDoubleClick={() => {
                                                                // ✅ Solo abre edición si la columna es editable
                                                                if (esEditable) setCeldaEditando(cellKey)
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault()
                                                                    // ✅ Solo abre edición si la columna es editable
                                                                    if (esEditable) {
                                                                        setCeldaEditando(cellKey)
                                                                        return
                                                                    }
                                                                }
                                                                moverseEnTablaGeneral(e, indexrow, indexCol)
                                                            }}
                                                            ref={el => { celdasTablaRef.current[cellKey] = el }}
                                                            onClick={() => setActiveCell(activeCell === cellKey ? null : cellKey)}
                                                            className={`flex justify-start overflow-hidden whitespace-nowrap text-ellipsis text-[12px]
                                                            ${esEditable ? "cursor-pointer" : "cursor-default"}
                                                            ${isTotal
                                                                ? Number(value) < 0
                                                                    ? "text-rose-500 bg-rose-50 px-1 rounded"
                                                                    : "text-green-600 bg-green-50 px-1 rounded"
                                                                : "text-slate-700"
                                                            }`}
                                                        >
                                                            <span className={`inline-block ${activeCell === cellKey ? "animate-scrollText" : "truncate"}`}>
                                                                {Number.isFinite(value) ? formatearNumero(value) : value}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                </section>

                {/* ===================== TABLA INFERIOR — NUEVO REGISTRO ===================== */}
                <section className="w-full flex flex-col gap-2">

                    {/* Label de sección */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Nuevo registro
                        </span>
                    </div>

                    <div className="w-full overflow-auto custom-scroll rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg">
                        <table className="min-w-[900px] w-full border-collapse table-fixed text-sm">
                            <thead className="bg-white/60 backdrop-blur-md text-slate-700">
                                <tr>
                                    {columnasTablaEditable.map((col, i) => {
                                        const headerKey = `headerEditable-${i}`
                                        return (
                                            <th
                                                key={col.key}
                                                onClick={() =>
                                                    setActiveHeader(activeHeader === headerKey ? null : headerKey)
                                                }
                                                className="px-2 py-1 text-[11px] font-semibold border-b border-white/40 text-center cursor-pointer hover:bg-white/40 transition"
                                            >
                                                <div className="w-full overflow-hidden whitespace-nowrap">
                                                    <span className={`block w-full ${activeHeader === headerKey ? "animate-scrollText" : "truncate"}`}>
                                                        {col.label}
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {columnasTablaEditable.map((col, index) => (
                                        <td key={col.key} className="px-2 py-1">
                                            <CellRenderer
                                                col={col}
                                                index={index}
                                                rowData={rowData}
                                                setRow={setRow}
                                                data={data}
                                                tieneError={tieneError}
                                                setCellRef={baseRef}
                                                moverseEntreCeldas={moverseEntreCeldas}
                                                columnasDeshabilitdasGenerales={columnasDeshabilitdasGenerales}
                                                procesarDatosTecnico={procesarDatosTecnico}
                                                setNotas={setNotas}
                                                isMobile={isMobile}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ===================== BOTONES ===================== */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">

                        {/* Izquierda — acciones secundarias */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl
                                bg-white/60 backdrop-blur-xl border border-white/50
                                text-amber-600 font-medium shadow-sm
                                hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={() => {
                                    setIsOpen(true)
                                    setModalTipo("NOTAS")
                                }}
                            >
                                📝 Notas
                            </button>

                            <button
                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl
                                bg-white/60 backdrop-blur-xl border border-white/50
                                text-green-600 font-medium shadow-sm
                                hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={clickExportExcel}
                            >
                                Exportar Excel
                            </button>
                        </div>

                        {/* Derecha — acciones primarias */}
                        <div className="flex flex-wrap items-center gap-2">

                            {/* MENSAJE — acción principal destacada */}
                            <button
                                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl
                                bg-indigo-500/90 backdrop-blur-xl
                                text-white font-semibold shadow-md shadow-indigo-200/50
                                hover:bg-indigo-500 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={() => {
                                    setIsOpen(true)
                                    setModalTipo("AUTO_MESSAGE")
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Mensaje
                            </button>

                            <button
                                className="px-5 py-2 text-sm rounded-xl
                                bg-white/60 backdrop-blur-xl border border-white/50
                                text-sky-600 font-semibold shadow-sm
                                hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={() => {
                                    setIsOpen(true)
                                    setModalTipo("FINALIZAR")
                                }}
                            >
                                Finalizar
                            </button>

                            <button
                                className="px-5 py-2 text-sm rounded-xl
                                bg-white/60 backdrop-blur-xl border border-white/50
                                text-sky-600 font-semibold shadow-sm
                                hover:bg-white/80 active:scale-95 transition-all duration-200 cursor-pointer"
                                onClick={handleBtnAgregar}
                            >
                                + Agregar
                            </button>

                        </div>
                    </div>

                </section>

            </div>

        </div>
        )}

        {/* ===================== MODAL ===================== */}
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40">

                            {(configModal[modalTipo]?.modalRender === 1) && <ContentNoList
                                message={configModal[modalTipo].message}
                                title={configModal[modalTipo].title}
                                btnTextCancel={configModal[modalTipo].cancelText}
                                btnTextConfirm={configModal[modalTipo].confirmText}
                                setIsOpen={setIsOpen}
                                finalizarTabla={finalizarTabla}
                                exportarExcelDB={exportarExcelDB}
                                hasFunction={configModal[modalTipo]?.hasFunction}
                                functionAction={configModal[modalTipo]?.functionName}
                                showBtn={configModal[modalTipo]?.showBtn}
                            />}
                            {(configModal[modalTipo]?.modalRender === 2) && <ContentList
                                message={configModal[modalTipo].message}
                                title={configModal[modalTipo]?.title}
                                btnTextCancel={configModal[modalTipo]?.cancelText}
                                setIsOpen={setIsOpen}
                                modalTipo={modalTipo}
                            />}
                            {(configModal[modalTipo]?.modalRender === 3) && <ModalHistorial
                                title={configModal[modalTipo]?.title}
                                setIsOpen={setIsOpen}
                                setError={setError}
                                nombre={nombre}
                                setLoading={setLoading}
                            />}
                            {(configModal[modalTipo]?.modalRender === 4) && (
                                <ModalAutoMessage
                                    title={configModal[modalTipo]?.title}
                                    setIsOpen={setIsOpen}
                                    setError={setError}
                                    setLoading={setLoading}
                                    procesarMensaje={procesarMensaje}
                                    setModalTipo={setModalTipo}
                                    setResultadoParcial={setResultadoParcial}
                                    setCamposFaltantes={setCamposFaltantes}
                                />
                            )}
                            {(configModal[modalTipo]?.modalRender === 5) && (
                                <ModalCamposFaltantes
                                    title={configModal[modalTipo]?.title}
                                    faltantes={camposFaltantes}
                                    resultadoParcial={resultadoParcial}
                                    setIsOpen={setIsOpen}
                                    procesarMensaje={procesarMensaje}
                                />
                            )}

                        </DialogPanel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    </>
    );
}
