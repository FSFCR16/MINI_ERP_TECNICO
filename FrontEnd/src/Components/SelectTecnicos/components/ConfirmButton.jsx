"use client";

export function ConfirmButton({ tecnicoValido, onClick }) {
  return (
    <div className="flex items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={!tecnicoValido}
        className={[
          "w-full md:w-auto px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200",
          tecnicoValido
            ? "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:scale-[1.01]"
            : "bg-slate-200 text-slate-400 cursor-not-allowed",
        ].join(" ")}
      >
        Confirmar
      </button>
    </div>
  );
}