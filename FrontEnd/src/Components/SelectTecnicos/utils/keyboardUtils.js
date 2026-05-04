// keyboardUtils.js — utilidades de navegación por teclado
// keyboardUtils.js — funciones puras para manejo de teclado

export function handleKeyDown(e, opts) {
  const {
    filtrados,
    indexResaltado,
    tecnicoValido,
    onSelect,
    onConfirm,
    setIndexResaltado,
    setMostrarList,
  } = opts;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setIndexResaltado((prev) => (prev < filtrados.length - 1 ? prev + 1 : 0));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setIndexResaltado((prev) => (prev > 0 ? prev - 1 : filtrados.length - 1));
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (indexResaltado >= 0 && filtrados[indexResaltado]) {
      onSelect(filtrados[indexResaltado]);
    } else if (tecnicoValido) {
      onConfirm();
    }
  } else if (e.key === "Escape") {
    setMostrarList(false);
    setIndexResaltado(-1);
  }
}
