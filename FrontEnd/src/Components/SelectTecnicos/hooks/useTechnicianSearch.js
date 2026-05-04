"use client";

import { useMemo, useState, useCallback, useRef } from "react";

export function useTechnicianSearch(tecnicos = []) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarList, setMostrarList] = useState(false);
  const [indexResaltado, setIndexResaltado] = useState(-1);

  const itemRefs = useRef([]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return [];

    return (Array.isArray(tecnicos) ? tecnicos : []).filter((tec) =>
      String(tec).toLowerCase().includes(texto),
    );
  }, [tecnicos, busqueda]);

  const tecnicoValido = useMemo(() => {
    return (Array.isArray(tecnicos) ? tecnicos : []).some(
      (tec) => String(tec).toLowerCase() === busqueda.trim().toLowerCase(),
    );
  }, [tecnicos, busqueda]);

  const manejarBusqueda = useCallback((valor) => {
    setBusqueda(valor);
    setMostrarList(true);
    setIndexResaltado(valor ? 0 : -1);
  }, []);

  const manejarSeleccion = useCallback((nombre) => {
    setBusqueda(nombre);
    setMostrarList(false);
    setIndexResaltado(-1);
  }, []);

  const cerrarLista = useCallback(() => {
    setMostrarList(false);
    setIndexResaltado(-1);
  }, []);

  const setItemRef = useCallback((node, index) => {
    itemRefs.current[index] = node;
  }, []);

  const moverScrollAlResaltado = useCallback((index) => {
    const node = itemRefs.current[index];
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  const manejarTeclado = useCallback(
    (e) => {
      if (!mostrarList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        setMostrarList(true);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndexResaltado((prev) => {
          const next = prev < filtrados.length - 1 ? prev + 1 : 0;
          setTimeout(() => moverScrollAlResaltado(next), 0);
          return next;
        });
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndexResaltado((prev) => {
          const next =
            prev > 0
              ? prev - 1
              : filtrados.length > 0
                ? filtrados.length - 1
                : -1;
          setTimeout(() => moverScrollAlResaltado(next), 0);
          return next;
        });
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (mostrarList && indexResaltado >= 0 && filtrados[indexResaltado]) {
          manejarSeleccion(filtrados[indexResaltado]);
          return;
        }

        if (tecnicoValido) {
          cerrarLista();
        }
      }

      if (e.key === "Escape") {
        cerrarLista();
      }
    },
    [
      mostrarList,
      filtrados,
      indexResaltado,
      tecnicoValido,
      manejarSeleccion,
      cerrarLista,
      moverScrollAlResaltado,
    ],
  );

  return {
    busqueda,
    filtrados,
    mostrarList,
    indexResaltado,
    tecnicoValido,
    manejarBusqueda,
    manejarSeleccion,
    manejarTeclado,
    cerrarLista,
    setItemRef,
  };
}
