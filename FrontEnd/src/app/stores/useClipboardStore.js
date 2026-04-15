import { create } from 'zustand'

export const useClipboardStore = create((set) => ({
    clipboardRegistros: [],
    copiarRegistros: (rows) => set({ clipboardRegistros: rows }),
    limpiarClipboard: () => set({ clipboardRegistros: [] }),
}))

export const useClipboardRegistros = () => useClipboardStore(s => s.clipboardRegistros)
export const useCopiarRegistros    = () => useClipboardStore(s => s.copiarRegistros)
export const useLimpiarClipboard   = () => useClipboardStore(s => s.limpiarClipboard)

export const useSeleccionStore = create((set) => ({
    seleccion: new Set(),
    iniciarDrag: (id) => set({ seleccion: new Set([id]) }),
    extenderDrag: (idInicio, ids) => set({ seleccion: new Set(ids) }),
    limpiarSeleccion: () => set(s => s.seleccion.size === 0 ? s : { seleccion: new Set() }),
    seleccionarTodos: (ids) => set({ seleccion: new Set(ids) }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR ESTABLE: devuelve boolean primitivo en vez del Set completo.
// Zustand solo re-renderiza FilaRegistro cuando el boolean CAMBIA para ese id.
// Sin esto, cada setState({ seleccion: new Set(...) }) re-renderiza TODAS las filas
// porque la referencia del Set siempre es nueva.
// ─────────────────────────────────────────────────────────────────────────────
export const useEsSeleccionada = (rowId) =>
    useSeleccionStore(s => s.seleccion.has(rowId))