"use client";
/**
 * Plan del bot, fase 1: sin sesión en este navegador, cualquier pantalla (menos «Entrar») lleva a «Entrar». Es solo
 * comodidad: la puerta de verdad es el servidor (sin token válido responde 401 a todo).
 */
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sesion } from "@/Services/api.js";

const nada = () => () => {};
const hay = () => !!sesion.lee();

export function GuardaSesion({ children }) {
  const ruta = usePathname();
  const router = useRouter();
  const conSesion = useSyncExternalStore(nada, hay, () => false);
  const abierta = ruta.startsWith("/entrar") || conSesion;
  useEffect(() => {
    if (!abierta) router.replace(`/entrar?volver=${encodeURIComponent(ruta)}`);
  }, [abierta, ruta, router]);
  return abierta ? children : null;
}
