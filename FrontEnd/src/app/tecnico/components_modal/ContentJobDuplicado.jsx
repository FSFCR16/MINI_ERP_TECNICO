import { formatearFechaSemana } from "@/Utils/api.js"

export function ContentJobDuplicado({ tecnico, onConfirmar, onCancelar }) {
    const semanaFormateada = tecnico.fecha_inicio && tecnico.fecha_fin
        ? `${formatearFechaSemana(tecnico.fecha_inicio)} - ${formatearFechaSemana(tecnico.fecha_fin)}`
        : tecnico.semana

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-800">
                Job ya registrado
            </h2>
            <p className="text-sm text-slate-600">
                El job <span className="font-mono font-semibold">{tecnico.job_name}</span> ya
                existe asignado a <span className="font-semibold">{tecnico.nombre}</span>.
            </p>
            <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 flex flex-col gap-1 border border-slate-100">
                <span>Técnico: <b>{tecnico.nombre}</b></span>
                <span>Job: <b>{tecnico.job}</b></span>
                <span>Total: <b>${tecnico.total}</b></span>
                <span>Semana: <b>{semanaFormateada}</b></span>
            </div>
            <p className="text-sm text-slate-500">¿Deseas agregarlo de todas formas?</p>
            <div className="flex gap-2 justify-end">
                <button onClick={onCancelar}
                    className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white transition-all">
                    Cancelar
                </button>
                <button onClick={onConfirmar}
                    className="px-4 py-1.5 text-sm rounded-xl bg-white/50 border border-white/40 text-sky-600 font-medium shadow-md hover:bg-white transition-all">
                    Agregar igual
                </button>
            </div>
        </div>
    )
}