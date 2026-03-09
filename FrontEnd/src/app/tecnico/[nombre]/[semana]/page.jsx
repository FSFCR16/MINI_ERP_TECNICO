"use client"
import { DialogPanel, Transition, TransitionChild, Dialog } from '@headlessui/react'
import { useEffect, useState, useRef } from "react"
import { Fragment } from "react";
import { useParams } from "next/navigation"
import { confirmarTecnico, ValidarSemanaTecnico,envioTablaDB,getRegistrosPrevios,eleiminarRegistrosDb,exportarExcelDBPost } from "../../../../Services/tencicosServices.js"
import { procesarDatosTecnico,procesarData } from "../../../../Utils/api.js"
import {MobileView} from "./components/MobileView.jsx";
import { tecnicoSchema } from '@/app/schemas/tecnicoSchema.js';
import { ContentList } from '../../components_modal/content_list.jsx';
import { ContentNoList } from '../../components_modal/content_noList.jsx';
import { LoadingOverlay } from '@/Components/loadingOverlay.jsx';
import { columnasBase } from './tableRow/columnasBase.jsx';
import { CellRenderer } from './tableRow/renderCell.jsx';

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

                await ValidarSemanaTecnico();
                const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(err => {
                    console.warn("No se pudieron obtener los registros previos:", err.message);
                    return []
                });
                const infoTecnico = await confirmarTecnico(nombre);
                const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                    procesarDatosTecnico(infoTecnico,dato)
                );
                
                const registrosCompletos = [...dataPreviaProcesada, ...registrosLocalStorage]
                // Limpiar estado antes de actualizar
                setListRegistros([]); 
                setListRegistros(registrosCompletos);
                setData(infoTecnico || []);
            } catch (err) {
                console.error(err);
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
            reg => reg.id_registro === null || reg.id_registro === undefined
            )
            const resultado = await envioTablaDB(registrosFiltrados)

            const registrosPrevios = await getRegistrosPrevios(nombre, semana).catch(err => {
                console.warn("No se pudieron obtener los registros previos:", err.message);
                return []
            });
            console.log(registrosPrevios)
            const dataPreviaProcesada = registrosPrevios.flatMap(dato =>
                    procesarDatosTecnico(data,dato)
            );
            console.log(dataPreviaProcesada)
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
            console.log(listRegistro)
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
            />
        ) : (
        <div className="h-screen w-full flex justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">

            <div className="w-full max-w-[1250px] flex flex-col gap-4 h-full">

                {/* ===================== TABLA SUPERIOR ===================== */}
                <section className="w-full flex-1 min-h-0 overflow-hidden rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border border-white/40">

                    <div className="w-full h-full overflow-auto custom-scroll">
                        <table className="w-full border-collapse table-fixed">

                            {/* HEADER */}
                            <thead className="bg-white/60 backdrop-blur-md text-slate-700 sticky top-0 z-10">

                                <tr>
                                    {columnasTablaGeneral.map((col, i) => {

                                        const headerKey = `header-${i}`

                                        return (

                                            <th
                                            key={col.key}
                                            className="px-1 py-1 text-[10px] font-semibold border-b border-white/40 text-center cursor-pointer hover:bg-white/40 transition"
                                            style={{ width: i === 0 ? "32px" : "auto" }}
                                            onClick={() =>
                                            setActiveHeader(activeHeader === headerKey ? null : headerKey)
                                            }
                                            >

                                                <div className="w-full overflow-hidden whitespace-nowrap">

                                                    <span
                                                    className={`block w-full ${
                                                    activeHeader === headerKey
                                                    ? "animate-scrollText"
                                                    : "truncate"
                                                    }`}
                                                    >
                                                    {col.label}
                                                    </span>

                                                </div>

                                            </th>

                                        )

                                    })}
                                </tr>

                            </thead>

                            {/* BODY */}
                            <tbody>

                                {listRegistro.map((row, indexrow) => (

                                    <tr
                                    key={indexrow}
                                    className={`transition duration-200 hover:bg-white/40
                                    ${elementosAEliminar.includes(row) ? "bg-blue-50/60" : ""}
                                    `}
                                    >

                                        {columnasTablaGeneral.map((col, indexCol) => {

                                            const cellKey = `${indexrow}-${indexCol}`
                                            const value = row[col.key]
                                            const isTotal = col.key === "total"

                                            return (

                                                <td
                                                key={indexCol}
                                                className={`px-1 py-1 border-b border-white/30
                                                ${indexCol === 0 ? "text-center w-[32px]" : "text-right"}
                                                `}
                                                >

                                                {/* CHECKBOX */}
                                                {indexCol === 0 ? (

                                                    <input
                                                    type="checkbox"
                                                    checked={elementosAEliminar.includes(row)}
                                                    onChange={() => toggleSeleccion(row)}
                                                    className="w-3.5 h-3.5 cursor-pointer"
                                                    />

                                                ) : (

                                                    <div
                                                    onClick={() =>
                                                    setActiveCell(activeCell === cellKey ? null : cellKey)
                                                    }
                                                    className={`flex justify-start overflow-hidden whitespace-nowrap text-ellipsis cursor-pointer text-[12px]

                                                    ${
                                                    isTotal
                                                    ? Number(value) < 0
                                                    ? "text-rose-500 bg-rose-50 px-1 rounded"
                                                    : "text-green-600 bg-green-50 px-1 rounded"
                                                    : "text-slate-700"
                                                    }
                                                    `}
                                                    >

                                                        <span
                                                        className={`inline-block ${
                                                        activeCell === cellKey ? "animate-scrollText" : "truncate"
                                                        }`}
                                                        >
                                                        {value}
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


                {/* ===================== TABLA INFERIOR ===================== */}
                <section className="w-full flex flex-col gap-4">

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

                                                    <span
                                                    className={`block w-full ${
                                                    activeHeader === headerKey
                                                    ? "animate-scrollText"
                                                    : "truncate"
                                                    }`}
                                                    >

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
                                {columnasTablaEditable.map((col, index) => {
                                    return (
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
                                            setNotas = {setNotas}
                                            isMobile={isMobile}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                            </tbody>
                        </table>
                    </div>


                    {/* ===================== BOTONES ===================== */}
                    <div className="w-full flex flex-wrap justify-end gap-3">

                        <button
                            className="px-5 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-green-600 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
                            onClick={clickExportExcel}
                        >
                            EXPORTAR A EXCEL
                        </button>

                        <button
                            className="cursor-pointer px-5 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-sky-600 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                            onClick={() => {
                            setIsOpen(true)
                            setModalTipo("FINALIZAR")
                            }}
                        >
                            FINALIZAR
                        </button>

                        <button
                            className="cursor-pointer px-5 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                            onClick={eliminarSeleccionados}
                        >
                            ELIMINAR
                        </button>

                        <button
                            className="cursor-pointer px-5 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-sky-600 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                            onClick={handleBtnAgregar}
                        >
                            AGREGAR
                        </button>
                        <button
                        className="px-5 py-1.5 flex items-center gap-2 text-sm rounded-xl
                        bg-white/40 backdrop-blur-xl
                        border border-white/40
                        text-amber-600 font-medium
                        shadow-md shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]
                        shadow-md hover:bg-white/60 hover:text-amber-700
                        active:scale-95 transition-all duration-200 cursor-pointer"
                        onClick={() => {
                            setIsOpen(true)
                            setModalTipo("NOTAS")
                        }}
                        >
                        📝 NOTAS
                        </button>

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
                                message = {configModal[modalTipo].message}
                                title = {configModal[modalTipo].title}
                                btnTextCancel = {configModal[modalTipo].cancelText}
                                btnTextConfirm = {configModal[modalTipo].confirmText}
                                setIsOpen = {setIsOpen}
                                finalizarTabla = {finalizarTabla}
                                exportarExcelDB = {exportarExcelDB}
                                hasFunction = {configModal[modalTipo]?.hasFunction}
                                functionAction = {configModal[modalTipo]?.functionName}
                                showBtn = {configModal[modalTipo]?.showBtn}
                            />}
                            {(configModal[modalTipo]?.modalRender === 2) && <ContentList
                                message = {configModal[modalTipo].message}
                                title = {configModal[modalTipo]?.title}
                                btnTextCancel = {configModal[modalTipo]?.cancelText}
                                setIsOpen = {setIsOpen}
                                modalTipo = {modalTipo}                           
                            />}
                        </DialogPanel>
                    </Transition.Child>
                    </div>

                </Dialog>
        </Transition>
    </>
    );

}
