import SelectTecnicos from "@/Components/SelectTecnicos/SelectTecnicos";

export default function Home() {
  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 pt-20 px-4">
      <main className="w-full max-w-xl flex flex-col gap-3 overflow-visible">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            Panel de gestión
          </p>
          <h1 className="text-3xl font-semibold text-slate-800">
            Seleccionar técnico
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Buscá un técnico para registrar la semana actual
          </p>
        </div>

        <SelectTecnicos />

        <div className="flex flex-col gap-2 mt-1">
          <p className="text-xs text-slate-400 text-center">accesos rápidos</p>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/tablas"
              className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/80 transition-all duration-200 cursor-pointer no-underline"
            >
              <p className="text-sm font-semibold text-slate-700">Tablas</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Ver resumen semanal
              </p>
            </a>
            <a
              href="/tecnicos"
              className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-5 py-4 shadow-sm hover:bg-white/80 transition-all duration-200 cursor-pointer no-underline"
            >
              <p className="text-sm font-semibold text-slate-700">Técnicos</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Agregar o editar técnicos
              </p>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
