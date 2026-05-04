"use client";

import { useEffect, useState } from "react";
import { obtenerTecnicos } from "@/Services/tencicosServices";
export function useTechnicianData() {
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const cargarTecnicos = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await obtenerTecnicos();

        if (!mounted) return;

        const lista = Array.isArray(data)
          ? data
          : Array.isArray(data?.tecnicos)
            ? data.tecnicos
            : [];

        setTecnicos(lista);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "No se pudieron cargar los técnicos");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    cargarTecnicos();

    return () => {
      mounted = false;
    };
  }, []);

  return { tecnicos, loading, error };
}
