"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { formatoFinal } from "@/Utils/api.js";
import {
  useLimpiarClipboard,
  useCopiarRegistros,
  useClipboardRegistros,
} from "../../app/stores/useClipboardStore.js";

import { LoadingOverlay } from "../loadingOverlay.jsx";
import { useTechnicianData } from "./hooks/useTechnicianData";
import { useTechnicianSearch } from "./hooks/useTechnicianSearch";
import { SearchInput } from "./components/SearchInput";
import { DropdownList } from "./components/DropdownList";
import { ConfirmButton } from "./components/ConfirmButton";
import { Backdrop } from "./components/Backdrop";

export default function SelectTecnicos() {
  const router = useRouter();
  const limpiarClipboard = useLimpiarClipboard();
  const copiarRegistros = useCopiarRegistros();
  const registrosEnClipboard = useClipboardRegistros();
  const semanaActual = formatoFinal();

  const { tecnicos, loading, error } = useTechnicianData();

  const {
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
  } = useTechnicianSearch(tecnicos);

  const [errorInput, setErrorInput] = useState("");

  useEffect(() => {
    if (tecnicoValido) setErrorInput("");
  }, [tecnicoValido]);

  const handleConfirmar = useCallback(() => {
    if (!tecnicoValido) {
      setErrorInput("Selecciona un técnico válido de la lista");
      return;
    }

    router.push(`/tecnico/${encodeURIComponent(busqueda)}/${semanaActual}`);
  }, [tecnicoValido, busqueda, semanaActual, router]);

  if (error) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl border border-red-300/40 rounded-3xl shadow-2xl px-10 py-16 text-center">
          <p className="text-red-600 font-medium text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      <div className="relative w-full overflow-visible">
        <section className="flex flex-col md:flex-row items-stretch md:items-start gap-3 bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-xl px-5 md:px-6 py-5 transition-all duration-300">
          <SearchInput
            busqueda={busqueda}
            tecnicoValido={tecnicoValido}
            errorInput={errorInput}
            onBusquedaChange={manejarBusqueda}
            onKeyDown={manejarTeclado}
            onFocus={() => {
              if (busqueda !== "") manejarBusqueda(busqueda);
            }}
          />

          <ConfirmButton
            tecnicoValido={tecnicoValido}
            onClick={handleConfirmar}
          />
        </section>

        {mostrarList && (
          <>
            <Backdrop onClick={cerrarLista} />
            <DropdownList
              filtrados={filtrados}
              indexResaltado={indexResaltado}
              onSelect={manejarSeleccion}
              setItemRef={setItemRef}
            />
          </>
        )}
      </div>
    </>
  );
}