"use client";
import Link from "next/link";

export function MobileHeader({ nombre, semanaFechas, openModal }) {
  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-sm px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-700">{nombre}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {semanaFechas.inicio} — {semanaFechas.fin} · {new Date().getFullYear()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-slate-500 shadow-sm active:scale-95 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-amber-600 shadow-sm active:scale-95 transition"
          onClick={() => openModal("HISTORIAL")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}