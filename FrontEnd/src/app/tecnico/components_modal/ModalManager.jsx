import { Fragment } from "react"
import { DialogPanel, Transition, Dialog } from '@headlessui/react'
import { ContentList } from './content_list.jsx'
import { ContentNoList } from './content_noList.jsx'
import { ModalHistorial } from './contentModalHistorial.jsx'
import { ModalAutoMessage } from './messageModal.jsx'
import { ModalCamposFaltantes } from './modalCamposFatantes.jsx'
import { getModalEntry } from './config_modal.jsx'

export function ModalManager({
    modal,
    closeModal,
    openModal,
    // para getModalEntry
    finalizarTabla,
    exportarExcelDB,
    notas,
    // para modales internos
    setError,
    setLoading,
    nombre,
    procesarMensaje,
    setResultadoParcial,
    setCamposFaltantes,
    camposFaltantes,
    resultadoParcial,
}) {
    const entrada = getModalEntry(modal.tipo, {
        finalizarTabla,
        exportarExcelDB,
        notas,
        errores: modal.errores,
    })

    return (
        <Transition appear show={modal.isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={closeModal}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/40">
                            {entrada?.modalRender === 1 && (
                                <ContentNoList
                                    message={entrada.message}
                                    title={entrada.title}
                                    btnTextCancel={entrada.cancelText}
                                    btnTextConfirm={entrada.confirmText}
                                    setIsOpen={closeModal}
                                    hasFunction={entrada?.hasFunction}
                                    functionAction={entrada?.functionName}
                                    showBtn={entrada?.showBtn}
                                />
                            )}
                            {entrada?.modalRender === 2 && (
                                <ContentList
                                    message={entrada.message}
                                    title={entrada?.title}
                                    btnTextCancel={entrada?.cancelText}
                                    setIsOpen={closeModal}
                                    modalTipo={modal.tipo}
                                />
                            )}
                            {entrada?.modalRender === 3 && (
                                <ModalHistorial
                                    title={entrada?.title}
                                    setIsOpen={closeModal}
                                    setError={setError}
                                    nombre={nombre}
                                    setLoading={setLoading}
                                />
                            )}
                            {entrada?.modalRender === 4 && (
                                <ModalAutoMessage
                                    title={entrada?.title}
                                    setIsOpen={closeModal}
                                    setError={setError}
                                    setLoading={setLoading}
                                    procesarMensaje={procesarMensaje}
                                    setModalTipo={openModal}
                                    setResultadoParcial={setResultadoParcial}
                                    setCamposFaltantes={setCamposFaltantes}
                                />
                            )}
                            {entrada?.modalRender === 5 && (
                                <ModalCamposFaltantes
                                    title={entrada?.title}
                                    faltantes={camposFaltantes}
                                    resultadoParcial={resultadoParcial}
                                    setIsOpen={closeModal}
                                    procesarMensaje={procesarMensaje}
                                />
                            )}
                        </DialogPanel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    )
}