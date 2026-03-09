"use client"
import { useEffect, useState } from "react"
import { traerDatosCartas } from "../../Services/tencicosServices.js"
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/Components/loadingOverlay.jsx";

export default function Page() {
    const router = useRouter()
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [listCartas, setListCartas] = useState([])
    const [listFiltrada, setListFiltrada] = useState([])
    const [busqueda, setBusqueda] = useState("")
    const esTouch = typeof window !== "undefined" && 'ontouchstart' in window

    useEffect(() => {

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            try {
                const datos = await traerDatosCartas();
                console.log(datos)
                setListCartas(datos || []);
                setListFiltrada(datos || [])
            } catch (err) {
                console.error(err);
                setError("No se pudo traer la informacion necesaria para construir las cartas");
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();

    }, []);

    const filtrarList = (valor) => {

        setBusqueda(valor)

        if (!valor) {
            setListFiltrada(listCartas)
            return
        }

        const listaFiltrada = listCartas.filter(elemento =>
            elemento.nombre.toLowerCase().includes(valor.toLowerCase())
        )

        setListFiltrada(listaFiltrada)
    }

    if (error) {
        return (
            <div className="w-full flex justify-center">
                <div
                    className="
                    w-full max-w-2xl
                    bg-white/60 backdrop-blur-xl
                    border border-red-300/40
                    rounded-3xl
                    shadow-2xl
                    px-10 py-16
                    text-center
                    "
                >
                    <p className="text-red-600 font-medium text-lg">
                    {error}
                    </p>
                </div>
            </div>
        );
    }
    return (
        <>
            {loading && <LoadingOverlay />}
            <div
            className="
            min-h-screen
            bg-gradient-to-br
            from-slate-100
            via-blue-100
            to-indigo-200
            relative
            overflow-hidden
            px-4 sm:px-6 lg:px-8
            py-8 sm:py-10 lg:py-14
            flex
            justify-center
            "
            >

            {/* 🌫 Glow ambiental dinámico */}
            <div className="absolute -top-40 -left-40 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" />

            <div
                className="
                relative z-10
                w-full
                max-w-md sm:max-w-xl lg:max-w-3xl
                flex flex-col
                gap-5 sm:gap-6 lg:gap-8
            "
            >

                {/* ================= HEADER ================= */}
                <div className="text-center">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-800 tracking-tight">
                    Técnicos
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Resumen semanal de registros
                </p>
                </div>

                {/* ================= BUSCADOR ================= */}
                <div
                className="
                bg-white/30
                backdrop-blur-2xl
                border border-white/40
                rounded-xl sm:rounded-2xl
                shadow-md
                p-3 sm:p-4
                "
                >
                <input
                    type="text"
                    value={busqueda}
                    placeholder="Buscar técnico..."
                    onChange={(e) => filtrarList(e.target.value)}
                    className="
                    w-full
                    bg-white/50
                    backdrop-blur-md
                    border border-white/40
                    rounded-lg sm:rounded-xl
                    px-3 sm:px-4
                    py-2
                    text-sm sm:text-base
                    text-slate-700
                    placeholder-slate-400
                    outline-none
                    focus:bg-white/70
                    focus:ring-2 focus:ring-indigo-200
                    transition-all duration-200
                    "
                />
                </div>

                {/* ================= LISTA ================= */}
                <div
                className="
                bg-white/25
                backdrop-blur-2xl
                border border-white/30
                rounded-2xl sm:rounded-3xl
                shadow-xl
                p-4 sm:p-5 lg:p-6
                max-h-[55vh] sm:max-h-[60vh] lg:max-h-[65vh]
                overflow-y-auto
                custom-scroll
                space-y-3 sm:space-y-4
                "
                >

                {listFiltrada.length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm">
                    No se encontraron técnicos
                    </div>
                )}

                {listFiltrada.map((cart, indexCart) => (
                    <div
                        {...(esTouch
                            ? { onClick: () => router.push(`/tecnico/${cart.nombre}/${cart.semana}`) }
                            : { onDoubleClick: () => router.push(`/tecnico/${cart.nombre}/${cart.semana}`) }
                        )}
                        key={`${cart.nombre}-${cart.semana_id}-${indexCart}`}
                        className="
                            flex justify-between items-center
                            px-4 sm:px-5
                            py-3 sm:py-4
                            rounded-xl sm:rounded-2xl
                            bg-white/40
                            backdrop-blur-xl
                            border border-white/40
                            transition-all duration-200 ease-out
                            hover:bg-white/55
                            hover:scale-[1.01]
                            hover:shadow-md
                            cursor-pointer
                            group
                        "
                    >

                        {/* Info */}
                        <div>
                            <p className="text-sm sm:text-base lg:text-lg font-semibold text-slate-800">
                                {cart.nombre}
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                                Semana {cart.semana.split("_").at(-1)}
                            </p>
                        </div>

                        {/* Badge */}
                        <div
                            className="
                                relative
                                flex flex-col items-center
                                min-w-[55px] sm:min-w-[65px]
                                px-3 sm:px-4
                                py-1.5 sm:py-2
                                rounded-lg sm:rounded-xl
                                bg-white/30
                                backdrop-blur-2xl
                                border border-white/40
                                shadow-md
                            "
                        >
                            <span
                                className="
                                    text-sm sm:text-base font-bold text-slate-800
                                    transition-transform duration-300
                                    group-hover:scale-110
                                "
                            >
                                {cart.total_registros}
                            </span>

                            <span className="text-[10px] sm:text-xs text-slate-600">
                                registros
                            </span>
                        </div>

                    </div>
                ))}

                </div>

            </div>
            </div>
        </>

    )
}