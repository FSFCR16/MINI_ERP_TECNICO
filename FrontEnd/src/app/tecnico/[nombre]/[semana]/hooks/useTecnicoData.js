"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

    // ← prevParams y su guard ELIMINADOS

    useEffect(() => {
        if (!nombre || !semanaStr) return;

        let isMounted = true;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            setData([]);           // limpiar estado anterior
            setRawRegistros([]);   // limpiar estado anterior

            try {
                const semanaFecha = await ValidarSemanaTecnico(semanaStr);
                if (!isMounted) return;

                setSemanaFechas({
                    inicio: formatearFechaSemana(semanaFecha?.fecha_inicio),
                    fin: formatearFechaSemana(semanaFecha?.fecha_fin)
                });

                const [infoTecnico, registrosPrevios] = await Promise.all([
                    confirmarTecnico(nombre),
                    getRegistrosPrevios(nombre, semanaStr).catch(() => [])
                ]);

                if (!isMounted) return;

                const tecnicoArray = Array.isArray(infoTecnico)
                    ? infoTecnico
                    : (infoTecnico ? [infoTecnico] : []);

                const registrosArray = Array.isArray(registrosPrevios)
                    ? registrosPrevios : [];

                setData(tecnicoArray);
                setRawRegistros(registrosArray);

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

        return () => {
            isMounted = false;
        };

    }, [nombre, semanaStr]);

    const listRegistro = useMemo(() => {
        if (!rawRegistros.length) return []
        if (!data.length) return rawRegistros

        const dataMap = new Map(
            data.map(t => [
                (t.job || "").replace(/\s+/g, ""),
                t
            ])
        )

        return rawRegistros.flatMap(dato => {
            const key = (dato.job || "").replace(/\s+/g, "")
            const tecnicoMatch = dataMap.get(key)
            return tecnicoMatch
                ? procesarDatosTecnico([tecnicoMatch], dato)
                : []
        })

    }, [rawRegistros, data])

    return {
        data,
        listRegistro,
        setListRegistros: setRawRegistros,
        loading,
        error,
        semanaFechas
    };
}