"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTecnicos } from "../../../Services/tencicosServices.js";

export function useModalAgregarTecnico() {
  const router = useRouter();
  const [modalAgregar, setModalAgregar] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [busquedaTecnico, setBusquedaTecnico] = useState("");
  const [indexResaltado, setIndexResaltado] = useState(-1);
  const [semanaLocal, setSemanalocal] = useState(null);
  const itemsRef = useRef([]);

  const filtradosTecnicos = useMemo(() => {
    return tecnicos.filter((t) =>
      t.toLowerCase().startsWith(busquedaTecnico.toLowerCase()),
    );
  }, [tecnicos, busquedaTecnico]);

  const tecnicoValido = useMemo(() => {
    return tecnicos.includes(busquedaTecnico.toUpperCase());
  }, [tecnicos, busquedaTecnico]);

  const abrirModalAgregar = async (semanaSeleccionada) => {
    if (tecnicos.length === 0) {
      const data = await obtenerTecnicos();
      setTecnicos(data || []);
    }
    setSemanalocal(semanaSeleccionada || null);
    setBusquedaTecnico("");
    setIndexResaltado(-1);
    setModalAgregar(true);
  };

  const cerrarModalAgregar = () => {
    setModalAgregar(false);
    setIndexResaltado(-1);
  };

  const confirmarAgregarTecnico = () => {
    if (!tecnicoValido || !semanaLocal) return;
    router.push(
      `/tecnico/${encodeURIComponent(busquedaTecnico)}/${semanaLocal.semana}`,
    );
  };

  const manejarTecladoModal = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexResaltado((prev) =>
        prev < filtradosTecnicos.length - 1 ? prev + 1 : 0,
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexResaltado((prev) =>
        prev > 0 ? prev - 1 : filtradosTecnicos.length - 1,
      );
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (indexResaltado >= 0 && filtradosTecnicos[indexResaltado]) {
        setBusquedaTecnico(filtradosTecnicos[indexResaltado]);
        setIndexResaltado(-1);
      } else if (tecnicoValido) {
        confirmarAgregarTecnico();
      }
    }

    if (e.key === "Escape") {
      cerrarModalAgregar();
    }
  };

  return {
    modalAgregar,
    tecnicos,
    busquedaTecnico,
    setBusquedaTecnico,
    indexResaltado,
    setIndexResaltado,
    itemsRef,
    tecnicoValido,
    filtradosTecnicos,
    abrirModalAgregar,
    cerrarModalAgregar,
    confirmarAgregarTecnico,
    manejarTecladoModal,
    setSemanalocal,
  };
}
