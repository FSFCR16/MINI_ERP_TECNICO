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

    // ✅ valor estable real
    const semanaStr = typeof semana === "string" ? semana : String(semana || "");

    // ✅ evitar llamadas duplicadas (Strict Mode / renders innecesarios)
    const prevParams = useRef({ nombre: null, semana: null });

    useEffect(() => {
        if (!nombre || !semanaStr) return;

        // 🚫 evitar re-ejecución innecesaria
        if (
            prevParams.current.nombre === nombre &&
            prevParams.current.semana === semanaStr
        ) return;

        prevParams.current = { nombre, semana: semanaStr };

        let isMounted = true;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            try {
                // ── 1. Validar semana ─────────────────────
                const semanaFecha = await ValidarSemanaTecnico(semanaStr);

                if (!isMounted) return;

                setSemanaFechas({
                    inicio: formatearFechaSemana(semanaFecha?.fecha_inicio),
                    fin: formatearFechaSemana(semanaFecha?.fecha_fin)
                });

                // ── 2. Requests en paralelo ───────────────
                const [infoTecnico, registrosPrevios] = await Promise.all([
                    confirmarTecnico(nombre),
                    getRegistrosPrevios(nombre, semanaStr).catch(() => [])
                ]);

                if (!isMounted) return;

                // ── 3. Normalización segura ───────────────
                const tecnicoArray = Array.isArray(infoTecnico)
                    ? infoTecnico
                    : (infoTecnico ? [infoTecnico] : []);

                const registrosArray = Array.isArray(registrosPrevios)
                    ? registrosPrevios
                    : [];

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

    // ✅ OPTIMIZACIÓN PRO: O(n) en vez de O(n²)
    const listRegistro = useMemo(() => {
        if (!rawRegistros.length || !data.length) return [];

        // 🔹 crear mapa para búsquedas rápidas
        const dataMap = new Map(
            data.map(t => [
                (t.job || "").replace(/\s+/g, ""),
                t
            ])
        );

        return rawRegistros.flatMap(dato => {
            const key = (dato.job || "").replace(/\s+/g, "");
            const tecnicoMatch = dataMap.get(key);

            return tecnicoMatch
                ? procesarDatosTecnico([tecnicoMatch], dato)
                : [];
        });

    }, [rawRegistros, data]);

    return {
        data,
        listRegistro,
        loading,
        error,
        semanaFechas
    };
}