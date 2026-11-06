"use client";
/**
 * Entrar al panel (plan del bot, fase 1 · 2026-11-06). Correo y clave → la sesión dura 30 días en este navegador.
 * Desde la app de GAELA («Abrir el ERP») llega un ?pase= de un solo uso: se canjea solo, sin pedir la clave.
 * Si la sesión vence en cualquier pantalla, la API trae aquí y, al entrar, se vuelve a donde se estaba.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, sesion } from "@/Services/api.js";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get("volver") || "/";
  const pase = params.get("pase");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(Boolean(pase));

  const canjeado = useRef(false);   // el pase sirve UNA vez: en desarrollo React corre el efecto dos veces
  useEffect(() => {
    if (!pase || canjeado.current) return;
    canjeado.current = true;
    api.post("/auth/canjear", { pase }).then(
      (r) => { sesion.guarda(r.token); router.replace("/"); },
      (err) => { setError(err.message || "El enlace venció. Ábrelo otra vez desde la app."); setOcupado(false); });
  }, [pase, router]);

  const entra = async (e) => {
    e.preventDefault();
    setOcupado(true);
    setError("");
    try {
      const r = await api.post("/auth/entrar", { email, clave });
      sesion.guarda(r.token);
      router.replace(volver.startsWith("/") && !volver.startsWith("//") ? volver : "/");
    } catch (err) {
      setError(err.message || "No se pudo entrar.");
      setOcupado(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={entra} className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Entrar</h1>
        <label className="block text-sm text-slate-600">Correo
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400/50" />
        </label>
        <label className="block text-sm text-slate-600">Clave
          <input type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400/50" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={ocupado}
          className="w-full py-2 rounded-xl bg-sky-600 text-white font-medium shadow hover:bg-sky-700 disabled:opacity-60 transition">
          {ocupado ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function Entrar() {
  return <Suspense fallback={null}><Formulario /></Suspense>;
}
