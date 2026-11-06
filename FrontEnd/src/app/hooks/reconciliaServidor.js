// Plan del bot, fase 2 · la sinergia panel ↔ servidor.
// El panel calcula y muestra al instante; al guardar, el servidor recalcula con la MISMA fórmula y devuelve cada fila.
// Si el servidor dice lo mismo, no pasa nada. Si dice otra cosa, gana el servidor: se reemplaza el número, la fila
// queda marcada (_ajustado) para resaltarla un momento y se arma el aviso «El total de DCBAV se ajustó: 120 → 118».
// Función pura (sin React): la usan useTablaEditable y sus pruebas.

export const CAMPOS_SERVIDOR = ["total", "porcentaje_cc"]

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v))

// lista: filas del panel · filasServidor: lo que devolvió el servidor ({id, total, porcentaje_cc, ...})
// idDeFila(fila) → el id de base de datos con el que se emparejan
export function aplicaServidor(lista, filasServidor, idDeFila = (r) => r.id_registro, ahora = Date.now()) {
    const porId = new Map((filasServidor ?? []).filter((f) => f && f.id != null).map((f) => [f.id, f]))
    const ajustes = []
    if (!porId.size) return { lista, ajustes }
    const nueva = lista.map((r) => {
        const s = porId.get(idDeFila(r))
        if (!s) return r
        let cambio = null
        for (const k of CAMPOS_SERVIDOR) {
            if (!(k in s)) continue
            const antes = num(r[k]), despues = num(s[k])
            if (despues === null || antes === despues) continue
            cambio = cambio ?? { ...r }
            cambio[k] = despues
            if (k === "total") ajustes.push({ job_name: r.job_name || r.job || "", antes, despues })
        }
        return cambio ? { ...cambio, _ajustado: ahora } : r
    })
    return { lista: nueva, ajustes }
}

export const textoAjuste = (a) => `El total de ${a.job_name || "un trabajo"} se ajustó: ${a.antes} → ${a.despues}`

export function textoAjustes(ajustes) {
    if (!ajustes.length) return ""
    if (ajustes.length === 1) return textoAjuste(ajustes[0])
    return `${ajustes.length} totales se ajustaron con el cálculo del servidor: ` +
        ajustes.slice(0, 3).map((a) => `${a.job_name || "?"} ${a.antes} → ${a.despues}`).join(" · ") +
        (ajustes.length > 3 ? " …" : "")
}
