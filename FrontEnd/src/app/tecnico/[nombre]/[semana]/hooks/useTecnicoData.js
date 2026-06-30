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

    // El vínculo registro↔contrato se cruza por tecnico_id (id del contrato,
    // estable) y NO por el texto del job (mutable). Así, si un contrato se
    // renombra (ej. TODO→LOCKOUT), los registros viejos no quedan huérfanos.
    const contratoPorId = new Map();
    const contratoPorJob = new Map();
    data.forEach((t) => {
      contratoPorId.set(t.id, t);
      contratoPorJob.set((t.job || "").replace(/\s+/g, ""), t);
    });

    const procesados = rawRegistros.reduce((acc, dato) => {
      // 1) por id de contrato (estable)  2) por texto de job (legacy)
      // 3) contrato borrado → pseudo-contrato desde el propio registro
      const contrato =
        contratoPorId.get(dato.tecnico_id) ??
        contratoPorJob.get((dato.job || "").replace(/\s+/g, "")) ??
        {
          id: dato.tecnico_id,
          nombre: dato.nombre,
          job: dato.job,
          porcentaje_tecnico: dato.porcentaje_tecnico ?? 0,
          porcentaje_gil: 0,
          adicional_dolar: 0,
          minimo: 0,
          porcentaje_cc: 0,
          cargo_sabados: 0,
          porcentaje_adicional_empresa: 0,
        };

      // Se fuerza el job del contrato al del registro para conservar la
      // etiqueta y los valores del contrato viejo (ej. TODO). De lo contrario
      // el guard de procesarDatosTecnico (job catálogo ≠ job registro)
      // descartaría los valores guardados y pintaría la fila vacía.
      acc.push(...procesarDatosTecnico([{ ...contrato, job: dato.job }], dato));
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
