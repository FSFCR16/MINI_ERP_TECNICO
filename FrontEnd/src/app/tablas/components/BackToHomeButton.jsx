"use client";

export function BackToHomeButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-white/50 backdrop-blur-xl border border-white/50 text-slate-500 font-medium shadow-sm hover:bg-white/70 active:scale-95 transition-all duration-200"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Inicio
    </button>
  );
}