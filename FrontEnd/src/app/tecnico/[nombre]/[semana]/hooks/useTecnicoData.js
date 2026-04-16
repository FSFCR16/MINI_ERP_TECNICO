"use client";

import { useState, useEffect, useMemo } from "react";
import {
    confirmarTecnico,
    ValidarSemanaTecnico,
    getRegistrosPrevios
} from "../../../../../Services/tencicosServices.js";
import {
    procesarDatosTecnico,
    formatearFechaSemana
} from "../../../../../Utils/api.js";

export function useTecnicoData(nombre, semana) {
    const [data, setData] = useState([]);
    const [rawRegistros, setRawRegistros] = useState([]);
    const [semanaFechas, setSemanaFechas] = useState({ inicio: "", fin: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const semanaStr = typeof semana === "string" ? semana : String(semana || "");

    useEffect(() => {
        if (!nombre || !semanaStr) return;

        let isMounted = true;
        // Generamos un ID único para los logs de esta ejecución específica
        const loadId = Math.random().toString(36).substring(7);

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            try {
                if (process.env.NODE_ENV === 'development') console.time(`⏱️ Validar-${loadId}`);
                const semanaFecha = await ValidarSemanaTecnico(semanaStr);
                if (process.env.NODE_ENV === 'development') console.timeEnd(`⏱️ Validar-${loadId}`);

                if (!isMounted) return;

                setSemanaFechas({
                    inicio: formatearFechaSemana(semanaFecha?.fecha_inicio),
                    fin: formatearFechaSemana(semanaFecha?.fecha_fin)
                });

                if (process.env.NODE_ENV === 'development') console.time(`⏱️ Info+Registros-${loadId}`);
                
                const [infoTecnico, registrosPrevios] = await Promise.all([
                    confirmarTecnico(nombre),
                    getRegistrosPrevios(nombre, semanaStr).catch(() => [])
                ]);

                if (process.env.NODE_ENV === 'development') console.timeEnd(`⏱️ Info+Registros-${loadId}`);

                if (!isMounted) return;

                setData(Array.isArray(infoTecnico) ? infoTecnico : (infoTecnico ? [infoTecnico] : []));
                setRawRegistros(Array.isArray(registrosPrevios) ? registrosPrevios : []);

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

        return () => { isMounted = false; };
    }, [nombre, semanaStr]);

    // Optimización: listRegistro solo se recalcula si rawRegistros o data cambian realmente
    const listRegistro = useMemo(() => {
        if (rawRegistros.length === 0) return [];
        if (data.length === 0) return rawRegistros;

        // Creamos el Map una sola vez por cada cambio de 'data'
        const dataMap = new Map();
        data.forEach(t => {
            const cleanJob = (t.job || "").replace(/\s+/g, "");
            dataMap.set(cleanJob, t);
        });

        return rawRegistros.reduce((acc, dato) => {
            const key = (dato.job || "").replace(/\s+/g, "");
            const tecnicoMatch = dataMap.get(key);
            
            if (tecnicoMatch) {
                // Usamos spread o push para evitar flatMap que a veces es más lento en arrays grandes
                const procesados = procesarDatosTecnico([tecnicoMatch], dato);
                acc.push(...procesados);
            }
            return acc;
        }, []);

    }, [rawRegistros, data]);

    return {
        data,
        listRegistro,
        setListRegistros: setRawRegistros,
        loading,
        error,
        semanaFechas
    };
}