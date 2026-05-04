"use client";

export function HistorialSearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none shadow-sm focus:bg-white/75 focus:ring-2 focus:ring-indigo-100 transition-all"
    />
  );
}