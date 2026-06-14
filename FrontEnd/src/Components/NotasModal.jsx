"use client"
import { NotasPanel } from "./NotasPanel.jsx"

// Overlay autocontenido (para Virginia, que no usa ModalManager).
// El general reutiliza directamente NotasPanel dentro de su ModalManager.
export function NotasModal({ nombre, semana, defaults, services, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <NotasPanel nombre={nombre} semana={semana} defaults={defaults} services={services} onClose={onClose} />
            </div>
        </div>
    )
}
