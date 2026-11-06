const APIURL = process.env.NEXT_PUBLIC_API_URL

// Plan del bot, fase 1 (2026-11-06): la API pide sesión. El token se guarda en este navegador y va en cada llamada;
// si el servidor dice 401 (venció o no hay), se borra y se va a «Entrar». Mismas funciones de siempre: nada más cambia.
const CLAVE_SESION = "erp-sesion"

export const sesion = {
    lee: () => { try { return localStorage.getItem(CLAVE_SESION) } catch { return null } },
    guarda: (token) => { try { localStorage.setItem(CLAVE_SESION, token) } catch { /* sin almacenamiento */ } },
    borra: () => { try { localStorage.removeItem(CLAVE_SESION) } catch { /* sin almacenamiento */ } },
}

class ApiError extends Error {
    constructor(status, body) {
        // El servidor responde { error } (su manejador) o { detail } (FastAPI): se muestra el que venga.
        super(body?.error || body?.detail || "Error en la petición")
        this.status = status
    }
}

const cabeceras = (json = true) => {
    const h = json ? { "Content-Type": "application/json" } : {}
    const t = sesion.lee()
    if (t) h.Authorization = `Bearer ${t}`
    return h
}

async function pide(url, opciones = {}, json = true) {
    const res = await fetch(`${APIURL}${url}`, { ...opciones, headers: cabeceras(opciones.body !== undefined) })
    if (res.status === 401) {
        sesion.borra()
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/entrar")) {
            window.location.href = `/entrar?volver=${encodeURIComponent(window.location.pathname + window.location.search)}`
        }
    }
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
    return json ? res.json() : res
}

const conCuerpo = (metodo, body) => ({ method: metodo, body: JSON.stringify(body) })

const api = {
    get: (url) => pide(url),
    post: (url, body) => pide(url, conCuerpo("POST", body)),
    delete: (url, body) => pide(url, conCuerpo("DELETE", body)),
    postRaw: (url, body) => pide(url, conCuerpo("POST", body), false),
    put: (url, body) => pide(url, conCuerpo("PUT", body)),
}

export { api, ApiError }
