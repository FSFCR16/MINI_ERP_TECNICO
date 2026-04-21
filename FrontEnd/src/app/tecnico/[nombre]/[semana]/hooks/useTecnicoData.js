"use client";

import { useState, useEffect } from "react";
import {
  confirmarTecnico,
  ValidarSemanaTecnico,
  getRegistrosPrevios,
} from "../../../../../Services/tencicosServices.js";
import {
  procesarDatosTecnico,
  formatearFechaSemana,
} from "../../../../../Utils/api.js";

export function useTecnicoData(nombre, semana) {
  const [data, setData] = useState([]);
  const [rawRegistros, setRawRegistros] = useState([]);
  const [listRegistro, setListRegistros] = useState([]);
  const [semanaFechas, setSemanaFechas] = useState({ inicio: "", fin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const semanaStr = typeof semana === "string" ? semana : String(semana || "");

  useEffect(() => {
    if (!nombre || !semanaStr) return;

    let isMounted = true;
    const loadId = Math.random().toString(36).substring(7);

    const cargarDatos = async () => {
      setLoading(true);
      setError(null);

      try {
        if (process.env.NODE_ENV === "development")
          console.time(`⏱️ Validar-${loadId}`);
        const semanaFecha = await ValidarSemanaTecnico(semanaStr);
        if (process.env.NODE_ENV === "development")
          console.timeEnd(`⏱️ Validar-${loadId}`);

        if (!isMounted) return;

        setSemanaFechas({
          inicio: formatearFechaSemana(semanaFecha?.fecha_inicio),
          fin: formatearFechaSemana(semanaFecha?.fecha_fin),
        });

        if (process.env.NODE_ENV === "development")
          console.time(`⏱️ Info+Registros-${loadId}`);

        const [infoTecnico, registrosPrevios] = await Promise.all([
          confirmarTecnico(nombre),
          getRegistrosPrevios(nombre, semanaStr).catch(() => []),
        ]);

        if (process.env.NODE_ENV === "development")
          console.timeEnd(`⏱️ Info+Registros-${loadId}`);

        if (!isMounted) return;

        const infoArray = Array.isArray(infoTecnico)
          ? infoTecnico
          : infoTecnico
            ? [infoTecnico]
            : [];

        const registrosArray = Array.isArray(registrosPrevios)
          ? registrosPrevios
          : [];

        setData(infoArray);
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

  // Cuando llegan los datos crudos, procesa y popula listRegistro
  useEffect(() => {
    if (rawRegistros.length === 0) {
      setListRegistros([]);
      return;
    }
    if (data.length === 0) {
      setListRegistros(rawRegistros);
      return;
    }

    const dataMap = new Map();
    data.forEach((t) => {
      const cleanJob = (t.job || "").replace(/\s+/g, "");
      dataMap.set(cleanJob, t);
    });

    const procesados = rawRegistros.reduce((acc, dato) => {
      const key = (dato.job || "").replace(/\s+/g, "");
      const tecnicoMatch = dataMap.get(key);
      if (tecnicoMatch) {
        acc.push(...procesarDatosTecnico([tecnicoMatch], dato));
      }
      return acc;
    }, []);

    setListRegistros(procesados);
  }, [rawRegistros, data]);

  return {
    data,
    listRegistro,
    setListRegistros, // ← ahora es independiente de rawRegistros
    loading,
    setLoading,
    error,
    semanaFechas,
  };
}
