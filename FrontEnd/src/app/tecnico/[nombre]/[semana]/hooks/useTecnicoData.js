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

    // ✅ valor estable (evita re-renders innecesarios)
    const semanaStr = useMemo(() => String(semana || ""), [semana]);

    useEffect(() => {
        if (!nombre || !semanaStr) return;

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

    // ✅ Procesamiento pesado MEMOIZADO (clave para evitar violation)
    const listRegistro = useMemo(() => {
        if (!rawRegistros.length || !data.length) return [];

        return rawRegistros.flatMap(dato => {
            const tecnicoMatch = data.find(
                t =>
                    (t.job || "").replace(/\s+/g, "") ===
                    (dato.job || "").replace(/\s+/g, "")
            );

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