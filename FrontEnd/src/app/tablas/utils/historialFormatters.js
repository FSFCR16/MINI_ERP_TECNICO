// Re-exporta las utilidades de formato del proyecto.
// Centraliza las dependencias de @/Utils/api.js para este módulo,
// de modo que si en el futuro se quieren customizar o desacoplar,
// solo hay que tocar este archivo.

export { formatearNumero, formatearFechaSemana } from "@/Utils/api.js";
