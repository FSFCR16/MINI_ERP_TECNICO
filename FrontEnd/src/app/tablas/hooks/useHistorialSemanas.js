"use client";

import { useEffect, useState } from "react";
import { traerSemanas } from "../../../Services/tencicosServices.js";

export function useHistorialSemanas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vistaSemanas, setVistaSemanas] = useState(true);
  const [listSemanas, setListSemanas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const loadSemanas = async () => {
    setLoading(true);
    setError(null);
    try {
      const semanas = await traerSemanas();
      setListSemanas(semanas || []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las semanas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemanas();
  }, []);

  return {
    loading,
    error,
    vistaSemanas,
    setVistaSemanas,
    listSemanas,
    setListSemanas,
    busqueda,
    setBusqueda,
    loadSemanas,
  };
}
