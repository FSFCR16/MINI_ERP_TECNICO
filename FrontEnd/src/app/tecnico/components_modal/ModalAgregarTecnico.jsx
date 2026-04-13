// /app/tecnico/components_modal/ModalAgregarTecnico.jsx
import { Fragment } from "react"
import { DialogPanel, Transition, TransitionChild, Dialog } from '@headlessui/react'

export function ModalAgregarTecnico({
    isOpen,
    onClose,
    tecnicos,
    busquedaTecnico,
    setBusquedaTecnico,
    indexResaltado,
    setIndexResaltado,
    itemsRef,
    onConfirmar,
    onKeyDown,
}) {
    const filtrados = tecnicos.filter(t =>
        t.toLowerCase().startsWith(busquedaTecnico.toLowerCase())
    )
    const tecnicoValido = tecnicos.includes(busquedaTecnico.toUpperCase())

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40 flex flex-col gap-4">
                            <h2 className="text-base font-semibold text-slate-800">Agregar técnico a la semana</h2>

                            <div className="relative">
                                <input
                                    autoFocus
                                    type="text"
                                    value={busquedaTecnico}
                                    placeholder="Buscar técnico..."
                                    onChange={(e) => { setBusquedaTecnico(e.target.value); setIndexResaltado(-1) }}
                                    onKeyDown={onKeyDown}
                                    className={`w-full bg-white/60 border rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:bg-white/80 focus:ring-2 focus:ring-indigo-100 transition-all ${
                                        tecnicoValido ? "border-green-300/70" : "border-white/50"
                                    }`}
                                />
                                {tecnicoValido && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}

                                {busquedaTecnico && filtrados.length > 0 && !tecnicoValido && (
                                    <ul className="absolute w-full mt-2 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-auto max-h-48 z-50">
                                        {filtrados.map((nombre, i) => (
                                            <li
                                                key={nombre}
                                                ref={el => itemsRef.current[i] = el}
                                                onClick={() => { setBusquedaTecnico(nombre); setIndexResaltado(-1) }}
                                                className={`px-4 py-2.5 text-sm text-slate-700 cursor-pointer transition-all ${
                                                    i < filtrados.length - 1 ? "border-b border-white/40" : ""
                                                } ${indexResaltado === i ? "bg-indigo-50/80 text-indigo-700" : "hover:bg-white/60"}`}
                                            >
                                                {nombre}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="flex gap-2 justify-end mt-2">
                                <button
                                    onClick={onClose}
                                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={onConfirmar}
                                    disabled={!tecnicoValido}
                                    className={`cursor-pointer px-4 py-1.5 text-sm rounded-xl font-medium shadow-md transition-all duration-200 active:scale-95 ${
                                        tecnicoValido
                                            ? "bg-white/50 backdrop-blur-xl border border-white/40 text-sky-600 hover:bg-white hover:shadow-lg"
                                            : "bg-white/30 text-slate-400 cursor-not-allowed border border-white/40"
                                    }`}
                                >
                                    Ir al técnico
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}