import { useState, useEffect } from "react"
import { confirmarTecnico, ValidarSemanaTecnico, getRegistrosPrevios } from "../../../../../Services/tencicosServices.js"
import { procesarDatosTecnico, formatearFechaSemana } from "../../../../../Utils/api.js"

export function useTecnicoData(nombre, semana) {
    const [data, setData] = useState([]);
    const [listRegistro, setListRegistros] = useState([]);
    const [semanaFechas, setSemanaFechas] = useState({ inicio: "", fin: "" });
    const [loading, setLoading] = useState(false); // Empezamos en false
    const [error, setError] = useState(null);

    useEffect(() => {
        // 1. Validaciones de salida inmediata
        if (!nombre || !semana) return;

        let isMounted = true;
        const controller = new AbortController(); // Para cancelar peticiones si el usuario navega rápido

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Forzamos a que semana sea string para evitar problemas de tipos
                const semanaStr = String(semana);
                
                const semanaFecha = await ValidarSemanaTecnico(semanaStr);
                
                if (!isMounted) return;

                setSemanaFechas({
                    inicio: formatearFechaSemana(semanaFecha.fecha_inicio),
                    fin: formatearFechaSemana(semanaFecha.fecha_fin)
                });

                const [infoTecnico, registrosPrevios] = await Promise.all([
                    confirmarTecnico(nombre),
                    getRegistrosPrevios(nombre, semanaStr).catch(() => []) // Si falla, devolvemos array vacío
                ]);

                if (!isMounted) return;

                // Validamos que registrosPrevios sea un array antes de procesar
                const segurosRegistros = Array.isArray(registrosPrevios) ? registrosPrevios : [];
                const tecnicoArray = Array.isArray(infoTecnico) ? infoTecnico : (infoTecnico ? [infoTecnico] : []);

                const dataPreviaProcesada = segurosRegistros.flatMap(dato => {
                    const tecnicoMatch = tecnicoArray.find(
                        t => t.job.replace(/\s+/g, "") === dato.job.replace(/\s+/g, "")
                    );
                    return tecnicoMatch ? procesarDatosTecnico([tecnicoMatch], dato) : [];
                });

                setData(tecnicoArray);
                setListRegistros(dataPreviaProcesada);

            } catch (err) {
                if (isMounted) {
                    console.error("Error en hook:", err);
                    setError("Error al cargar la información.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        cargarDatos();

        // Limpieza: Esto es lo que detiene el caos si el componente se desmonta
        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [nombre, String(semana)]); // <-- El String(semana) es clave aquí

    return { data, listRegistro, loading, error, semanaFechas };
}