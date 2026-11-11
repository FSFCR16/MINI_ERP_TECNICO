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
from sqlalchemy.orm import Session

from app.db import get_db

VUELTAS = 210_000
DURACION_SESION = 30 * 24 * 3600   # 30 días: el dueño no quiere entrar a cada rato (2026-11-06)
INTENTOS, VENTANA = 5, 600
# Seguridad E5 (2026-11-11): además del freno por correo, uno por IP. Más alto que el del correo para que una oficina
# con varias personas detrás de la misma IP no se quede fuera por equivocarse unas cuantas veces.
INTENTOS_IP = 20
VIDA_CODIGO = 600                  # 10 minutos para escribir el código del correo


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


def version_de_sesion(clave_hash: str) -> str:
    """Seguridad E1 (2026-11-11): la «versión» de las sesiones de un usuario, sacada de su clave guardada (sin columna
    nueva en la base). Cambiar la clave del usuario (o el «sin-clave:…» de quien entra desde GAELA) invalida TODAS sus
    sesiones abiertas. Es una huella con el secreto: no revela nada de la clave."""
    return hmac.new(_secreto(), f"version:{clave_hash}".encode(), hashlib.sha256).hexdigest()[:16]


def token_de_sesion(uid: int, clave_hash: str | None = None) -> str:
    # Seguridad E1 (2026-11-11): la sesión nueva lleva la versión («v»). Las de antes, sin «v», siguen valiendo hasta
    # que venzan (compatibles hacia atrás), pero también se cortan si el usuario se desactiva.
    datos = {"t": "sesion", "u": uid}
    if clave_hash:
        datos["v"] = version_de_sesion(clave_hash)
    return firma(datos, DURACION_SESION)


def pase(uid: int, jti: str) -> str:
    """«Abrir el ERP» desde la app de GAELA: un pase de UN solo uso que vale 60 s. Se canjea por una sesión normal
    (`/auth/canjear`); después de canjeado o vencido no sirve, así que copiar el enlace no da acceso."""
    return firma({"t": "pase", "u": uid, "j": jti}, 60)


def lee_pase(token: str) -> dict | None:
    d = lee_firma(token)
    return d if d and d.get("t") == "pase" else None


def reto_de_codigo(uid: int, codigo: str, jti: str) -> str:
    """Lo que el navegador guarda entre la clave y el código. Lleva una huella del código, no el código."""
    return firma({"t": "codigo", "u": uid, "j": jti, "h": _huella_codigo(jti, codigo)}, VIDA_CODIGO)


def lee_reto(reto: str, codigo: str) -> dict | None:
    d = lee_firma(reto)
    if not d or d.get("t") != "codigo":
        return None
    return d if hmac.compare_digest(d["h"], _huella_codigo(d["j"], codigo)) else None


def _huella_codigo(jti: str, codigo: str) -> str:
    return hmac.new(_secreto(), f"{jti}:{codigo}".encode(), hashlib.sha256).hexdigest()


DURACION_EXCEL = 48 * 3600   # Seguridad E8 (2026-11-11): 48 h (antes 7 días). Los enlaces ya mandados no cambian.


def enlace_excel(nombre: str, semana: str, dura: int = DURACION_EXCEL) -> str:
    """El token de un enlace de Excel (un técnico, una semana). Dura 48 horas por defecto (Seguridad E8)."""
    return firma({"t": "excel", "n": nombre, "s": semana}, dura)


def valida_enlace_excel(token: str, nombre: str, semana: str) -> bool:
    d = lee_firma(token)
    return bool(d and d.get("t") == "excel" and d.get("n") == nombre and d.get("s") == semana)


# ── El freno de intentos ────────────────────────────────────────────────────────────────────────────────────────
_fallos: dict[str, list[float]] = defaultdict(list)


def _recientes(clave: str) -> int:
    ahora = time.time()
    vivos = [t for t in _fallos.get(clave, []) if ahora - t < VENTANA]
    if vivos:
        _fallos[clave] = vivos
    else:
        _fallos.pop(clave, None)     # Seguridad E5: no guardar para siempre cada correo o IP que falló una vez
    return len(vivos)


def frenado(email: str) -> bool:
    return _recientes(email) >= INTENTOS


def anota_fallo(email: str) -> None:
    _fallos[email].append(time.time())


# Seguridad E5 (2026-11-11): freno por IP. Las claves llevan «ip:» delante para no mezclarse con los correos.
def ip_de(request: Request) -> str:
    """La IP de quien llama. Detrás del proxy de Render llega en X-Forwarded-For (la primera es la del cliente). Se
    puede falsear, pero solo para saltarse ESTE freno (el del correo sigue); nunca deja fuera a otra persona."""
    reenviada = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return (reenviada or (request.client.host if request.client else "") or "?")[:64]


def frenado_ip(ip: str) -> bool:
    return _recientes("ip:" + ip) >= INTENTOS_IP


def anota_fallo_ip(ip: str) -> None:
    _fallos["ip:" + ip].append(time.time())


_RELLENO: list[str] = []


def verifica_relleno(clave: str) -> None:
    """Seguridad E5 (2026-11-11): con un correo que no existe se hace el mismo trabajo (PBKDF2) que con uno que sí,
    para que el tiempo de respuesta no delate qué correos tienen usuario."""
    if not _RELLENO:
        _RELLENO.append(hashea(secrets.token_hex(16)))
    verifica(clave, _RELLENO[0])


def limpia_fallos(email: str) -> None:
    _fallos.pop(email, None)


# ── Quién llama ─────────────────────────────────────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Quien:
    tipo: str          # «persona» (el panel) o «chat» (el bot)
    usuario: int | None


def ruta_del_chat(path: str) -> bool:
    """Seguridad E2 (2026-11-11): lo único que abre la llave del chat. Son TODAS las rutas que llaman el chat de GAELA
    (`puerto_tecnicos.py`, `llaves_del_panel.py` y el paso de las pantallas de Técnicos en `checkout_propio.py`): todas
    van bajo /api/bot/, más el pase de «Abrir el ERP». El resto de la API (panel del ERP) pide sesión de persona."""
    return path == "/api/bot" or path.startswith("/api/bot/") or path == "/auth/pase-chat"


def requiere_acceso(request: Request, db: Session = Depends(get_db)) -> Quien:
    """La puerta de toda la API: una sesión válida o la llave del chat. Sin eso, 401."""
    from app.models_bot import UsuarioERP   # aquí para no cruzar imports al cargar los modelos

    llave = os.getenv("ERP_LLAVE_CHAT", "")
    dada = request.headers.get("x-llave-chat", "")
    llave_buena = bool(llave and dada and hmac.compare_digest(dada, llave))
    if llave_buena and ruta_del_chat(request.url.path):
        return Quien("chat", None)
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        d = lee_firma(auth[7:].strip())
        if d and d.get("t") == "sesion":
            # Seguridad E1 (2026-11-11): el usuario tiene que seguir existiendo y activo, y si la sesión trae versión,
            # tiene que ser la de su clave de ahora (cambiarla cierra todas sus sesiones).
            u = db.get(UsuarioERP, int(d["u"]))
            if u and u.activo and ("v" not in d or hmac.compare_digest(str(d["v"]), version_de_sesion(u.clave_hash))):
                return Quien("persona", u.id)
    if llave_buena:   # Seguridad E2: la llave es buena, pero esta ruta no es del bot
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La llave del chat solo sirve para el bot.")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tu sesión terminó. Vuelve a entrar.")


ACCESO = [Depends(requiere_acceso)]
