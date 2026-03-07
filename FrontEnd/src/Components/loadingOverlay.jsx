export function LoadingOverlay({ text = "Cargando..." }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md"
    >
      <div
        className="bg-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-4"
      >
        {/* spinner */}
        <div
          className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"
        />

        <p className="text-slate-700 text-sm font-medium">
          {text}
        </p>
      </div>
    </div>
  );
}