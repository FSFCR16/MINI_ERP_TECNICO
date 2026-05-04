"use client";

export function HistorialSearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl px-5 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-sm focus:bg-white/75 dark:focus:bg-slate-800/80 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
    />
  );
}