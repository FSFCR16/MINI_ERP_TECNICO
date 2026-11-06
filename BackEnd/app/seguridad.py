"""
SEGURIDAD DEL ERP (plan del bot, fase 1 · 2026-11-06). Antes cualquiera podía leer, crear o borrar registros llamando a
la API (sin inicio de sesión y con CORS abierto a todos). Ahora:

- **Inicio de sesión** (`POST /auth/entrar`): correo y clave → un token firmado que dura 12 horas. La clave se guarda
  con PBKDF2-SHA256 (210.000 vueltas, sal propia); se compara en tiempo constante.
- **Toda la API** pide ese token (`Authorization: Bearer …`) o, para el bot del chat, la llave `ERP_LLAVE_CHAT`
  (`X-Llave-Chat`). Sin uno de los dos: 401.
- **Freno**: 5 intentos fallidos por correo en 10 minutos bloquean ese correo 10 minutos.
- **Enlaces de Excel firmados** que vencen: se pueden mandar por WhatsApp sin dar acceso a nada más.

Solo la librería estándar (hashlib, hmac): sin dependencias nuevas. El secreto sale de `ERP_SECRETO` (sin él, el
servidor no arranca: mejor caído que abierto).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from collections import defaultdict
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status

VUELTAS = 210_000
DURACION_SESION = 30 * 24 * 3600   # 30 días: el dueño no quiere entrar a cada rato (2026-11-06)
INTENTOS, VENTANA = 5, 600


def _secreto() -> bytes:
    s = os.getenv("ERP_SECRETO", "")
    if len(s) < 16:
        raise RuntimeError("Falta ERP_SECRETO (mínimo 16 caracteres): sin él no se firma nada y el ERP no arranca.")
    return s.encode()


# ── Claves ──────────────────────────────────────────────────────────────────────────────────────────────────────
def hashea(clave: str) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, VUELTAS)
    return f"pbkdf2${VUELTAS}${base64.b64encode(sal).decode()}${base64.b64encode(h).decode()}"


def verifica(clave: str, guardado: str) -> bool:
    try:
        _, vueltas, sal, h = guardado.split("$")
        nuevo = hashlib.pbkdf2_hmac("sha256", clave.encode(), base64.b64decode(sal), int(vueltas))
        return hmac.compare_digest(nuevo, base64.b64decode(h))
    except (ValueError, TypeError):
        return False


# ── Tokens firmados (sesión y enlaces) ──────────────────────────────────────────────────────────────────────────
def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _de_b64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def firma(datos: dict, dura: int) -> str:
    cuerpo = _b64(json.dumps({**datos, "exp": int(time.time()) + dura}, separators=(",", ":")).encode())
    return f"{cuerpo}.{_b64(hmac.new(_secreto(), cuerpo.encode(), hashlib.sha256).digest())}"


def lee_firma(token: str) -> dict | None:
    """Los datos del token si la firma es buena y no venció; None si no."""
    try:
        cuerpo, f = token.split(".")
        bueno = _b64(hmac.new(_secreto(), cuerpo.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(f, bueno):
            return None
        datos = json.loads(_de_b64(cuerpo))
        return datos if datos.get("exp", 0) > time.time() else None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def token_de_sesion(uid: int) -> str:
    return firma({"t": "sesion", "u": uid}, DURACION_SESION)


def pase(uid: int, jti: str) -> str:
    """«Abrir el ERP» desde la app de GAELA: un pase de UN solo uso que vale 60 s. Se canjea por una sesión normal
    (`/auth/canjear`); después de canjeado o vencido no sirve, así que copiar el enlace no da acceso."""
    return firma({"t": "pase", "u": uid, "j": jti}, 60)


def lee_pase(token: str) -> dict | None:
    d = lee_firma(token)
    return d if d and d.get("t") == "pase" else None


def enlace_excel(nombre: str, semana: str, dura: int = 7 * 24 * 3600) -> str:
    """El token de un enlace de Excel (un técnico, una semana). Dura 7 días por defecto."""
    return firma({"t": "excel", "n": nombre, "s": semana}, dura)


def valida_enlace_excel(token: str, nombre: str, semana: str) -> bool:
    d = lee_firma(token)
    return bool(d and d.get("t") == "excel" and d.get("n") == nombre and d.get("s") == semana)


# ── El freno de intentos ────────────────────────────────────────────────────────────────────────────────────────
_fallos: dict[str, list[float]] = defaultdict(list)


def frenado(email: str) -> bool:
    ahora = time.time()
    _fallos[email] = [t for t in _fallos[email] if ahora - t < VENTANA]
    return len(_fallos[email]) >= INTENTOS


def anota_fallo(email: str) -> None:
    _fallos[email].append(time.time())


def limpia_fallos(email: str) -> None:
    _fallos.pop(email, None)


# ── Quién llama ─────────────────────────────────────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Quien:
    tipo: str          # «persona» (el panel) o «chat» (el bot)
    usuario: int | None


def requiere_acceso(request: Request) -> Quien:
    """La puerta de toda la API: una sesión válida o la llave del chat. Sin eso, 401."""
    llave = os.getenv("ERP_LLAVE_CHAT", "")
    dada = request.headers.get("x-llave-chat", "")
    if llave and dada and hmac.compare_digest(dada, llave):
        return Quien("chat", None)
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        d = lee_firma(auth[7:].strip())
        if d and d.get("t") == "sesion":
            return Quien("persona", int(d["u"]))
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tu sesión terminó. Vuelve a entrar.")


ACCESO = [Depends(requiere_acceso)]
