export function filtrarHistorial(base = [], texto = "", vistaSemanas = true) {
  const palabras = texto.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (palabras.length === 0) return base;

  return base.filter((item) => {
    const textoRegistro = `
      ${item.nombre || ""}
      ${item.fecha_inicio || ""}
      ${item.fecha_fin || ""}
      ${item.total_registros || ""}
      ${item.total_tecnicos || ""}
      ${item.semana || ""}
    `.toLowerCase();

    return palabras.every((p) => textoRegistro.includes(p));
  });
}
