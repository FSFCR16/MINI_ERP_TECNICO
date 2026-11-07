"use client";
/**
 * Entrar al panel: correo y clave, y luego el código que llega al correo. La sesión dura 30 días en este navegador.
 * Desde la app de GAELA («Abrir el ERP») llega un ?pase= de un solo uso: se canjea solo, sin pedir nada.
 * Si la sesión vence en cualquier pantalla, la API trae aquí y, al entrar, se vuelve a donde se estaba.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, sesion } from "@/Services/api.js";

const CAMPO = "mt-1 w-full px-3 py-2.5 rounded-xl bg-white/80 border border-white/60 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400";
const BOTON = "w-full py-2.5 rounded-xl bg-sky-500 text-white font-medium shadow-sm hover:bg-sky-600 disabled:opacity-60 transition-colors";
const ENLACE = "w-full text-sm text-slate-500 hover:text-slate-800 underline underline-offset-2 disabled:opacity-60";
const TARJETA = "bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm p-5 space-y-4";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const pedido = params.get("volver") || "/";
  const volver = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";
  const pase = params.get("pase");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [reto, setReto] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(Boolean(pase));

  const canjeado = useRef(false);   // el pase sirve UNA vez: en desarrollo React corre el efecto dos veces
  useEffect(() => {
    if (!pase || canjeado.current) return;
    canjeado.current = true;
    api.post("/auth/canjear", { pase }).then(
      (r) => { sesion.guarda(r.token); router.replace("/"); },
      (err) => { setError(err.message || "El enlace venció. Ábrelo otra vez desde la app."); setOcupado(false); });
  }, [pase, router]);

  const dentro = (r) => { sesion.guarda(r.token); router.replace(volver); };

  const pide = async (accion, fallo) => {
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      await accion();
    } catch (err) {
      setError(err.message || fallo);
    }
    setOcupado(false);
  };

  const entra = (e) => {
    e.preventDefault();
    pide(async () => {
      const r = await api.post("/auth/entrar", { email, clave });
      if (r.reto) setReto(r); else dentro(r);
    }, "No se pudo entrar.");
  };

  const confirma = (e) => {
    e.preventDefault();
    pide(async () => dentro(await api.post("/auth/codigo", { reto: reto.reto, codigo })), "No se pudo comprobar el código.");
  };

  const otroCodigo = () => pide(async () => {
    setReto(await api.post("/auth/entrar", { email, clave }));
    setCodigo("");
    setAviso("Te mandamos otro código.");
  }, "No se pudo mandar otro código.");

  return (
    <main className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 pt-16 px-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Panel de gestión</p>
          <h1 className="text-3xl font-semibold text-slate-800">{reto ? "Revisa tu correo" : "Entrar"}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {reto ? `Te mandamos un código de 6 dígitos a ${reto.correo}.` : pase ? "Abriendo el ERP…" : "Escribe tu correo y tu clave para continuar"}
          </p>
        </div>

        {!pase && !reto && (
          <form onSubmit={entra} className={TARJETA}>
            <label className="block text-sm text-slate-600">Correo
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
            </label>
            <label className="block text-sm text-slate-600">Clave
              <input type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} className={CAMPO} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={ocupado} className={BOTON}>{ocupado ? "Entrando…" : "Continuar"}</button>
          </form>
        )}

        {reto && (
          <form onSubmit={confirma} className={TARJETA}>
            <label className="block text-sm text-slate-600">Código
              <input inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="[0-9]{6}" autoFocus value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} className={`${CAMPO} tracking-[0.4em] text-center text-lg`} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            {aviso && <p role="status" className="text-sm text-slate-600">{aviso}</p>}
            <button type="submit" disabled={ocupado} className={BOTON}>{ocupado ? "Comprobando…" : "Entrar"}</button>
            <button type="button" disabled={ocupado} onClick={otroCodigo} className={ENLACE}>Mandar otro código</button>
          </form>
        )}

        {pase && !reto && error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </div>
    </main>
  );
}

export default function Entrar() {
  return <Suspense fallback={null}><Formulario /></Suspense>;
}
