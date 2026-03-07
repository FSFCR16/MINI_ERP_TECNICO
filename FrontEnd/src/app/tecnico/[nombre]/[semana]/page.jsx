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


export default function Page() {

    const columnasBase = [
        { key: "check_box", label: "", hideOn: ["editable"], tipo:"checkbox"},
        { key: "nombre", label: "NOMBRE", disableOn: ["editable"], tipo:"text"},
        { key: "job", label: "JOB", tipo:"text" },
        { key: "job_name", label: "JOB NAME", tipo:"text" },
        { key: "valor_servicio", label: "VALOR SERVICIO",tipo:"number" },
        { key: "tipo_pago", label: "TIPO DE PAGO", tipo:"text"},
        { key: "valor_tarjeta", label: "VALOR TARJETA", disableOnPago: ["CC", "CASH"], tipo:"number"},
        { key: "valor_efectivo", label: "VALOR EFECTIVO", disableOnPago: ["CC", "CASH"], tipo:"number" },
        { key: "partes_gil", label: "PARTES GIL", tipo:"number"},
        { key: "partes_tecnico", label: "PARTES TECNICO", tipo:"number"},
        { key: "tech", label: "TECH", tipo:"number"},
        { key: "porcentaje_tecnico", label: "PORCENTAJE TECNICO", tipo:"number"},
        { key: "porcentaje_cc", label: "PORCENTAJE CC", tipo:"number"},
        { key: "total", label: "TOTAL", hideOn: ["editable"], tipo:"number"},
    ];

    const { nombre, semana} = useParams();
    const [erroresCampos, setErroresCampos] = useState([])
    const columnasDeshabilitdasGenerales = ["nombre"]
    const [isOpen, setIsOpen] = useState(false)
    const [data, setData] = useState([]);
    const [elementosAEliminar, setElementosAEliminar] = useState([]);
    const [rowData, setRow] = useState({});
    const [selectedJob, setJob] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listRegistro, setListRegistros] = useState([])
    const [dataPersistenteModificada, setDatModificada] = useState({})
    const [modalTipo, setModalTipo] = useState("")
    const [isMobile, setIsMobile] = useState(false);
    const [notas, setNotas] = useState([]);
    const inputsReferencias = useRef([])
    const [registrosLocalStroge, setRegistrosLocalStorage] = useState([])

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
                console.log(infoTecnico)
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

        if (data.length === 1) {
            base = procesarDatosTecnico(data[0])
        }

        setRow(base);
        setNotas(base?.notas)
        setDatModificada(base)

        if (data.length === 1) {
            setJob(data[0].job);
        }

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

    const handleJobChange = (e) => {
        const jobSeleccionado = e.target.value;
        setJob(jobSeleccionado);
        const objetoEncontrado = data.find(item => item.job === jobSeleccionado);
        const resultObjeto = procesarDatosTecnico(objetoEncontrado)
        setRow(resultObjeto || {});
        setNotas(resultObjeto?.notas)
    };

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
        console.log(rowCopy)
        const resultado = tecnicoSchema.safeParse(rowCopy)
        console.log(resultado, "stop")
        if (!resultado.success) {

            const errores = mapearErroresZod(resultado.error)
            setErroresCampos(errores)
            setModalTipo("ERROR")
            setIsOpen(true)
            return
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
        try {
            const registrosFiltrados = listRegistro.filter(
            reg => !reg.id_registro
            )

            const resultado = await envioTablaDB(registrosFiltrados)
            window.location.reload()

        } catch (error) {
            console.error("Error:", error)
        }
        localStorage.removeItem(`registrosTemporales_${nombre}_${semana}`)
        setRegistrosLocalStorage([])
        setIsOpen(false)
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
            const blob = await (await exportarExcelDBPost(regustrosGuardados,nombre,semana)).blob()
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
                selectedJob={selectedJob}
                handleJobChange={handleJobChange}
                data={data}
                inputsReferencias={inputsReferencias}
                moverseEntreCeldas={moverseEntreCeldas}
                handleBtnAgregar={handleBtnAgregar}
                toggleSeleccion={toggleSeleccion}
                elementosAEliminar={elementosAEliminar}
                eliminarSeleccionados={eliminarSeleccionados}
                setIsOpen={setIsOpen}
                setModalTipo={setModalTipo}
                tieneError={tieneError}
            />
        ) : (
        <div className="h-screen w-full flex justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 px-4 py-4">

            <div className="w-full max-w-[1250px] flex flex-col gap-4 h-full">

                {/* ===================== TABLA SUPERIOR ===================== */}
                <section className="w-full flex-1 min-h-0 overflow-hidden rounded-2xl shadow-xl bg-white/70 backdrop-blur-xl border border-white/40">

                    <div className="w-full h-full overflow-auto custom-scroll">
                        <table className="min-w-[900px] w-full border-collapse">

                            <thead className="bg-white/60 backdrop-blur-md text-slate-700 sticky top-0 z-10">
                            <tr>
                                {columnasTablaGeneral.map(col => (
                                <th
                                    key={col.key}
                                    className="px-2 py-2 text-[11px] font-semibold border-b border-white/40 whitespace-nowrap text-center"
                                >
                                    {col.label}
                                </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            {listRegistro.map((row, indexrow) => (
                                <tr
                                key={indexrow}
                                className="hover:bg-white/40 transition duration-200"
                                >
                                {columnasTablaGeneral.map((col, indexCol) => (
                                    <td
                                    key={indexCol}
                                    className="px-2 py-1 text-[13px] border-b border-white/30 text-center"
                                    >
                                    <input
                                        type={col.tipo}
                                        value={row[col.key]}
                                        readOnly
                                        className="w-full bg-transparent outline-none truncate focus:whitespace-normal"
                                        onChange={() => {
                                        toggleSeleccion(row);
                                        }}
                                        checked={elementosAEliminar.includes(row) ?? false}
                                    />
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>

                        </table>
                    </div>
                </section>


                {/* ===================== TABLA INFERIOR ===================== */}
                <section className="w-full flex flex-col gap-4">

                    <div className="w-full overflow-auto custom-scroll rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg">
                        <table className="min-w-[900px] w-full border-separate border-spacing-0 text-sm">

                            <thead className="bg-white/60 backdrop-blur-md text-slate-700">
                            <tr>
                                {columnasTablaEditable.map(col => (
                                <th
                                    key={col.key}
                                    className="px-2 py-2 text-[11px] font-semibold border-b border-white/40 whitespace-nowrap text-center"
                                >
                                    {col.label}
                                </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody>
                            <tr>
                                {columnasTablaEditable.map((col, index) => {

                                if (col.key === "job") {
                                    if (data.length > 1) {
                                    return (
                                        <td key={col.key} className="px-2 py-1">
                                        <select
                                            ref={(el) => {
                                            if (!inputsReferencias.current[0]) {
                                                inputsReferencias.current[0] = [];
                                            }
                                            inputsReferencias.current[0][index] = el;
                                            }}
                                            value={selectedJob}
                                            onChange={handleJobChange}
                                            onKeyDown={(e) => moverseEntreCeldas(e, index)}
                                            className={`w-full px-2 py-1 text-[13px] rounded-lg border backdrop-blur-md outline-none
                                            ${tieneError(col.key) 
                                            ? "border-red-400 bg-red-50/70"
                                            : "border-white/40 bg-white/60"}
                                            `}
                                        >
                                            <option value="">Seleccione...</option>
                                            {data.map((item, index) => (
                                            <option key={index} value={item.job}>
                                                {item.job}
                                            </option>
                                            ))}
                                        </select>
                                        </td>
                                    );
                                    }

                                    return (
                                    <td key={col.key} className="px-2 py-1">
                                        <input
                                        onKeyDown={(e) => moverseEntreCeldas(e, index)}
                                        ref={(el) => {
                                            if (!inputsReferencias.current[0]) {
                                            inputsReferencias.current[0] = [];
                                            }
                                            inputsReferencias.current[0][index] = el;
                                        }}
                                        value={rowData.job || ""}
                                        disabled
                                        />
                                    </td>
                                    );
                                }

                                if (col.key === "tipo_pago") {
                                    return (
                                    <td key={col.key} className="px-2 py-1">
                                        <select
                                        onKeyDown={(e) => moverseEntreCeldas(e, index)}
                                        ref={(el) => {
                                            if (!inputsReferencias.current[0]) {
                                            inputsReferencias.current[0] = [];
                                            }
                                            inputsReferencias.current[0][index] = el;
                                        }}
                                        value={rowData.tipo_pago ?? ""}
                                        onChange={(e) => {
                                            setRow({
                                            ...rowData,
                                            tipo_pago: e.target.value
                                            });
                                        }}
                                        className={`w-full px-2 py-1 text-[13px] rounded-lg border backdrop-blur-md outline-none transition
                                        ${tieneError(col.key) 
                                        ? "border-red-400 bg-red-50/70 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
                                        : "border-white/40 bg-white/60"}
                                        `}
                                        >
                                        <option value="">Seleccione...</option>
                                        {!rowData.opciones_pago || rowData.opciones_pago.map((item, index) => (
                                            <option key={index} value={item}>
                                            {item}
                                            </option>
                                        ))}
                                        </select>
                                    </td>
                                    );
                                }

                                return (
                                    <td key={col.key} className="px-2 py-1">
                                    <input
                                        type={col.tipo}
                                        onKeyDown={(e) => moverseEntreCeldas(e, index)}
                                        ref={(el) => {
                                        if (!inputsReferencias.current[0]) {
                                            inputsReferencias.current[0] = [];
                                        }
                                        inputsReferencias.current[0][index] = el;
                                        }}
                                        disabled={columnasDeshabilitdasGenerales.includes(col.key)}
                                        value={rowData[col.key] == 0 ? "" : rowData[col.key] ?? ""}
                                        onChange={(e) => {
                                        const { value, type } = e.target;

                                        setRow({
                                            ...rowData,
                                            [col.key]: type === "number" && value !== ""
                                            ? Number(value)
                                            : value
                                        });
                                        }}
                                        className={`w-full p-1 text-[13px] rounded-lg outline-none text-center transition
                                        ${tieneError(col.key)
                                        ? "bg-red-50/70 border border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
                                        : "bg-transparent hover:bg-slate-100"}
                                        `}
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
