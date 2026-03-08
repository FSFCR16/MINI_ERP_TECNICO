import {DialogTitle} from '@headlessui/react'

export function ContentNoList({message, title, btnTextConfirm, btnTextCancel, setIsOpen, hasFunction, functionAction, showBtn}){
    return(
        <>
            <DialogTitle className="text-base font-semibold text-slate-800 mb-4">
                {title}
            </DialogTitle>
                <p className="text-slate-700 text-sm">
                    {message}
                </p>
            <div className="mt-6 flex justify-end gap-3">
                <button
                onClick={() => setIsOpen(false)}
                className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-rose-500 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                >
                {btnTextCancel}
                </button>
                {showBtn &&
                <button
                onClick={hasFunction
                    ? functionAction
                    : undefined}
                className="cursor-pointer px-4 py-1.5 text-sm rounded-xl bg-white/50 backdrop-blur-xl border border-white/40 text-sky-600 font-medium shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
                >
                {btnTextConfirm}
                </button>
                }

            </div>
        </>
    )
}