"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx";
import { obtenerTecnicos } from "@/Services/tencicosServices";
import { vaObtenerNombres, vaValidarSemana } from "@/Services/virginiaServices";
import { formatoFinal } from "@/Utils/api.js";

const Dot = ({ mod }) => <span className={`w-2 h-2 rounded-full shrink-0 ${mod === "gen" ? "bg-sky-500" : "bg-indigo-500"}`} />;

export default function Home() {
  const router = useRouter();
  const [modulo, setModulo] = useState("gen"); // "gen" | "vir"
  const [busqueda, setBusqueda] = useState("");
  const [nombresGen, setNombresGen] = useState([]);
  const [nombresVir, setNombresVir] = useState([]);
  const [yendo, setYendo] = useState(false);

  useEffect(() => {
    obtenerTecnicos().then((d) => setNombresGen(Array.isArray(d) ? d : [])).catch(() => {});
    vaObtenerNombres().then((d) => setNombresVir(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const nombres = modulo === "gen" ? nombresGen : nombresVir;
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return [];
    return nombres.filter((n) => String(n).toLowerCase().includes(q)).slice(0, 8);
  }, [nombres, busqueda]);

  const ir = async (nombre) => {
    if (!nombre) return;
    if (modulo === "gen") {
      router.push(`/tecnico/${encodeURIComponent(nombre)}/${formatoFinal()}`);
    } else {
      setYendo(true);
      try {
        const sem = await vaValidarSemana();
        router.push(`/virginia/${encodeURIComponent(nombre)}/${sem.semana}`);
      } catch {
        setYendo(false);
      }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && filtrados.length > 0) ir(filtrados[0]);
  };

  const acentoBtn = modulo === "gen" ? "bg-sky-500" : "bg-indigo-500";

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 pt-16 px-4">
      {yendo && <LoadingOverlay />}
      <main className="w-full max-w-xl flex flex-col gap-4 overflow-visible">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Panel de gestión</p>
          <h1 className="text-3xl font-semibold text-slate-800">Seleccionar técnico</h1>
          <p className="text-sm text-slate-500 mt-1">Elegí el módulo y buscá un técnico para registrar la semana actual</p>
        </div>

        {/* Toggle General | Virginia */}
        <div className="inline-flex bg-white/50 backdrop-blur-xl rounded-xl p-1 border border-white/50 w-fit">
          {[["gen", "General"], ["vir", "Virginia"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => { setModulo(k); setBusqueda(""); }}
              className={`flex items-center gap-1.5 px-5 py-1.5 text-xs rounded-lg font-medium transition cursor-pointer ${
                modulo === k ? `${k === "gen" ? "bg-sky-500" : "bg-indigo-500"} text-white shadow-sm` : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <Dot mod={k} /> {l}
            </button>
          ))}
        </div>

        {/* Buscador scopeado al módulo */}
        <div className="relative">
          <div className="flex gap-3 bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-xl px-5 py-4">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Buscar técnico de ${modulo === "gen" ? "General" : "Virginia"}...`}
              className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400"
            />
            <button
              onClick={() => ir(filtrados[0])}
              disabled={filtrados.length === 0}
              className={`px-5 py-1.5 text-xs rounded-xl text-white font-medium cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${acentoBtn}`}
            >
              Ir
            </button>
          </div>

          {busqueda && (
            <div className="absolute left-0 right-0 mt-2 z-20 bg-white/85 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg overflow-hidden">
              {filtrados.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">Sin resultados en {modulo === "gen" ? "General" : "Virginia"}</p>
              ) : (
                filtrados.map((n) => (
                  <button
                    key={n}
                    onClick={() => ir(n)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-white/40 last:border-0 text-left"
                  >
                    <Dot mod={modulo} />
                    <span className="text-sm font-medium text-slate-700">{n}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tarjetas de acceso */}
        <div className="grid grid-cols-3 gap-3 mt-1">
          <button
            onClick={() => router.push("/tecnicos")}
            className="rounded-2xl p-5 shadow-md border bg-sky-50/70 border-sky-200/60 cursor-pointer hover:bg-sky-50 transition text-left"
          >
            <div className="flex items-center gap-2 mb-1"><Dot mod="gen" /><p className="text-sm font-semibold text-sky-700">General</p></div>
            <p className="text-xs text-slate-500">Técnicos</p>
          </button>
          <button
            onClick={() => router.push("/virginia")}
            className="rounded-2xl p-5 shadow-md border bg-indigo-50/70 border-indigo-200/60 cursor-pointer hover:bg-indigo-50 transition text-left"
          >
            <div className="flex items-center gap-2 mb-1"><Dot mod="vir" /><p className="text-sm font-semibold text-indigo-700">Virginia</p></div>
            <p className="text-xs text-slate-500">Técnicos y pagos</p>
          </button>
          <button
            onClick={() => router.push("/tablas")}
            className="rounded-2xl p-5 shadow-md border bg-white/60 border-white/40 cursor-pointer hover:bg-white/80 transition text-left"
          >
            <p className="text-sm font-semibold text-slate-700">Tablas</p>
            <p className="text-xs text-slate-500 mt-0.5">Historial</p>
          </button>
        </div>
      </main>
    </div>
  );
}
