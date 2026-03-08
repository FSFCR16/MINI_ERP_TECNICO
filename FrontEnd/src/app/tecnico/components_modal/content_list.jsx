import { DialogTitle } from '@headlessui/react'

export function ContentList({ message, title, btnTextCancel, setIsOpen, modalTipo }) {

  return (
    <>
      <DialogTitle className="text-base font-semibold text-slate-800 mb-2">
        {title}
      </DialogTitle>

      {Array.isArray(message) && message.map((e, index) => (
        modalTipo === "NOTAS"
          ? (
            <p className="text-slate-700 text-sm" key={index}>
              {index + 1}. {e}
            </p>
          )
          : (
            <p className="text-slate-700 text-sm" key={e.label}>
              {e.label}: {e.message}
            </p>
          )
      ))}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setIsOpen(false)}
          className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
        >
          {btnTextCancel}
        </button>
      </div>
    </>
  )
}