import { useState, useEffect } from "react"
import { confirmarTecnico, ValidarSemanaTecnico, getRegistrosPrevios } from "../../../../../Services/tencicosServices.js"
import { procesarDatosTecnico, formatearFechaSemana } from "../../../../../Utils/api.js"

export function useTecnicoData(nombre, semana) {
    const [data, setData] = useState([])
    const [listRegistro, setListRegistros] = useState([])
    const [registrosLocalStorage, setRegistrosLocalStorage] = useState([])
    const [semanaFechas, setSemanaFechas] = useState({ inicio: "", fin: "" })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!nombre) return

        const cargarDatos = async () => {
            setLoading(true)
            setError(null)
            try {
                const semanaFecha = await ValidarSemanaTecnico(semana)
                setSemanaFechas({
                    inicio: formatearFechaSemana(semanaFecha.fecha_inicio),
                    fin: formatearFechaSemana(semanaFecha.fecha_fin)
                })
                const [infoTecnico, registrosPrevios] = await Promise.all([
                    confirmarTecnico(nombre),
                    getRegistrosPrevios(nombre, semana).catch(err => {
                        console.warn("No se pudieron obtener registros previos:", err.message)
                        return []
                    })
                ])

                // 👇 AGREGA ESTA LÍNEA TEMPORAL
                console.log("REGISTROS PREVIOS DEL BACKEND:", JSON.stringify(registrosPrevios[0], null, 2))

                // infoTecnico puede ser objeto o array según el backend
                const tecnicoArray = Array.isArray(infoTecnico)
                    ? infoTecnico
                    : infoTecnico
                        ? [infoTecnico]
                        : []

                const dataPreviaProcesada = registrosPrevios.flatMap(dato => {
                    const tecnicoMatch = tecnicoArray.find(
                        t => t.job.replace(/\s+/g, "") === dato.job.replace(/\s+/g, "")
                    )
                    if (!tecnicoMatch) return []
                    
                    console.log("dato.tipo_pago:", JSON.stringify(dato.tipo_pago)) // ✅
                    
                    return procesarDatosTecnico([tecnicoMatch], dato)
                })
                
                console.log("dataPreviaProcesada completa:", dataPreviaProcesada.map(r => ({
                    id: r.id,
                    id_registro: r.id_registro,
                    job_name: r.job_name,
                    total: r.total
                })))

                setData(tecnicoArray)
                setListRegistros(dataPreviaProcesada)
            } catch (err) {
                console.error("Error cargando datos:", err)
                setError("No se pudo validar la semana o cargar la información.")
            } finally {
                setLoading(false)
            }
        }

        cargarDatos()
    }, [nombre, semana])

    return {
        data, setData,
        listRegistro, setListRegistros,
        registrosLocalStorage, setRegistrosLocalStorage,
        loading, setLoading,
        error, setError,
        semanaFechas,
    }
}