"use client";
/**
 * Plan del bot, fase 1: sin sesión en este navegador, cualquier pantalla (menos «Entrar») lleva a «Entrar». Es solo
 * comodidad: la puerta de verdad es el servidor (sin token válido responde 401 a todo).
 */
import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sesion } from "@/Services/api.js";

// 🔴 TEMPORAL (pedido del dueño, 2026-11-06): sin pantalla de entrar. Va junto con ERP_SIN_SESION en el servidor.
const SIN_SESION = true;
const nada = () => () => {};
const hay = () => !!sesion.lee();

export function GuardaSesion({ children }) {
  const ruta = usePathname();
  const router = useRouter();
  const conSesion = useSyncExternalStore(nada, hay, () => false);
  const abierta = SIN_SESION || ruta.startsWith("/entrar") || conSesion;
  useEffect(() => {
    if (!abierta) router.replace(`/entrar?volver=${encodeURIComponent(ruta)}`);
  }, [abierta, ruta, router]);
  return abierta ? children : null;
}
