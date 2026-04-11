const APIURL = process.env.NEXT_PUBLIC_API_URL

class ApiError extends Error {
    constructor(status, body) {
        super(body?.detail || "Error en la petición")
        this.status = status
    }
}

const api = {
    get: async (url) => {
        const res = await fetch(`${APIURL}${url}`)
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
        return res.json()
    },

    post: async (url, body) => {
        const res = await fetch(`${APIURL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
        return res.json()
    },

    delete: async (url, body) => {
        const res = await fetch(`${APIURL}${url}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
        return res.json()
    },

    postRaw: async (url, body) => {
        const res = await fetch(`${APIURL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
        return res
    },

    put: async (url, body) => {
        const res = await fetch(`${APIURL}${url}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
        return res.json()
    }
}

export { api, ApiError }