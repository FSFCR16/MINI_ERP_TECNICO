"""
EL VOCABULARIO DE LA IA (D-381 / D-382, 2026-11-17) — qué significa cada palabra, en UN solo sitio.

El prompt (`lector.REGLAS`) dice cómo razonar; las PALABRAS viven solo aquí, en la tabla `vocabulario_ia`, y van a la
sección 3 del prompt agrupadas por significado («pagado con tarjeta → CC: cc, card, scanpay…»). Antes estaban
escritas a mano en el prompt Y en el vocabulario, y la búsqueda proponía las que la IA ya sabía (parts, scanpay, ccf).

  - Las palabras BASE (las que estaban en el prompt) se siembran una vez (`siembra_base`, desde migrar_bot.py) y luego
    se editan como cualquier otra. Si la tabla aún no tiene las base (no se ha corrido la migración), se usan las del
    código: la IA nunca lee sin vocabulario por un despiste.
  - Cualquiera del panel agrega, edita, acepta, rechaza o quita. Una palabra existe UNA vez (índice único).
  - Una vez por semana (o con «Buscar ya») UNA llamada a la IA revisa los trabajos validados y corregidos y propone
    palabras nuevas; solo corre una búsqueda a la vez y nunca propone una que ya existe (activa, rechazada o quitada).
  - Al aceptar una palabra, los casos de «Lo que leyó distinto» que la explican pasan a «Revisados».
Lo exacto (la comisión «ccf N», el %) NO va aquí: lo hace el código (`lector.senales`).
"""

from __future__ import annotations

import json
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import lectura_ia, lector
from app.models import registrosSchemma
from app.models_bot import BusquedaVocabulario, MensajeBot, PalabraIA

# significado → (cómo se le dice al dueño, cómo encabeza su línea en el prompt). El orden es el del prompt.
SIGNIFICADOS: dict[str, tuple[str, str]] = {
    "partes_tecnico": ("partes del técnico", "partes del técnico → parts_tecnico"),
    "partes_gil": ("partes de Gil", "partes de Gil → parts_gil"),
    "tech": ("pago al técnico (to tech)", "pago al técnico → tech"),
    "tarjeta": ("pagado con tarjeta", "pagado con tarjeta → CC"),
    "cash": ("pagado en efectivo", "pagado en efectivo → CASH"),
    "valor": ("valor del servicio", "valor del servicio → valor_servicio"),
    "car_key": ("trabajo CAR KEY", "tipo CAR KEY"),
    "lockout": ("trabajo LOCKOUT", "tipo LOCKOUT"),
}

# Lo que antes estaba escrito a mano en el prompt (2026-11-09), ahora como vocabulario: (palabra, significa, ejemplo)
BASE: list[tuple[str, str, str | None]] = [
    ("parts", "partes_tecnico", None), ("part", "partes_tecnico", None),
    ("keys", "partes_tecnico", "«10$ keys» = 10 de partes del técnico"),
    ("p", "partes_tecnico", "pegada al número: «10p», «$50p»"),
    ("cp", "partes_gil", "«40$ cp», «cp 40»"), ("company parts", "partes_gil", None),
    ("parts company", "partes_gil", None), ("part company", "partes_gil", None),
    ("parte company", "partes_gil", None), ("parts gil", "partes_gil", None),
    ("to tech", "tech", None), ("to technician", "tech", None), ("for tech", "tech", None),
    ("para el tecnico", "tech", None),
    ("cc", "tarjeta", None), ("card", "tarjeta", None), ("credit", "tarjeta", None), ("credit card", "tarjeta", None),
    ("scanpay", "tarjeta", None), ("paid to", "tarjeta", "«paid to Afik»"), ("zelle", "tarjeta", None),
    ("cash app", "tarjeta", None), ("venmo", "tarjeta", None),
    ("cash", "cash", None), ("efectivo", "cash", None), ("le pago en mano al tecnico", "cash", None),
    ("car key", "car_key", None), ("car key made", "car_key", None), ("key made", "car_key", None),
    ("key program", "car_key", None), ("key programming", "car_key", None),
    ("lockout", "lockout", None), ("car lockout", "lockout", None), ("lock out", "lockout", None),
    ("locked out", "lockout", None), ("lock change", "lockout", None), ("lock", "lockout", None),
]

CADA = timedelta(days=7)
MAX_EJEMPLOS = 40
_PALABRA = re.compile(r"^[\w$#.\- ]{1,40}$")
_busqueda = threading.Lock()          # una búsqueda a la vez (el 2026-11-17 corrieron dos y duplicaron todo)

_cache: tuple[float, str, int] = (0.0, "", 0)
_VIDA_CACHE_S = 60


def invalidar() -> None:
    global _cache
    _cache = (0.0, "", 0)


def norm_palabra(p: str) -> str:
    return re.sub(r"\s+", " ", (p or "").strip().lower())


def _fila(p: PalabraIA) -> dict[str, Any]:
    return {"id": p.id, "palabra": p.palabra, "significa": p.significa,
            "significa_texto": SIGNIFICADOS.get(p.significa, (p.significa,))[0], "explicacion": p.explicacion,
            "estado": p.estado, "origen": p.origen, "evidencia": json.loads(p.evidencia) if p.evidencia else [],
            "por": p.por}


# ─────────────────────────────── 1. el vocabulario en el prompt ───────────────────────────────
def texto(palabras: list[tuple[str, str, str | None]]) -> str:
    """La sección 3: una línea por significado, sus palabras separadas por comas, cada ejemplo entre paréntesis."""
    grupos: dict[str, list[str]] = {}
    for palabra, significa, ejemplo in palabras:
        if significa in SIGNIFICADOS:
            grupos.setdefault(significa, []).append(f"{palabra} ({ejemplo})" if ejemplo else palabra)
    if not grupos:
        return ""
    lineas = [f"- {SIGNIFICADOS[s][1]}: {', '.join(grupos[s])}" for s in SIGNIFICADOS if s in grupos]
    return "\n━━━ 3. VOCABULARIO (qué significa cada palabra) ━━━\n" + "\n".join(lineas) + "\n"


def _activas(db: Session) -> list[tuple[str, str, str | None]] | None:
    """Las activas de la tabla; None si las base aún no se sembraron (entonces manda el código)."""
    if not db.query(PalabraIA.id).filter(PalabraIA.origen == "base").first():
        return None
    filas = db.query(PalabraIA).filter(PalabraIA.estado == "activa").order_by(PalabraIA.id).all()
    return [(p.palabra, p.significa, p.explicacion) for p in filas]


def texto_prompt(sesion: Callable[[], Session] | None = None) -> tuple[str, int]:
    """(sección 3 del prompt, cuántas palabras). Se guarda 60 s para no ir a la base en cada mensaje de una tanda.
    Sin base sembrada o si la base falla: las palabras BASE del código (nunca se lee sin vocabulario)."""
    global _cache
    if time.monotonic() - _cache[0] < _VIDA_CACHE_S:
        return _cache[1], _cache[2]
    palabras = None
    try:
        if sesion is None:
            from app.db import SessionLocal
            sesion = SessionLocal
        db = sesion()
        try:
            palabras = _activas(db)
        finally:
            db.close()
    except Exception as e:      # noqa: BLE001 — se sigue con las del código
        print(f"[vocabulario] no se pudo leer: {e}")
    palabras = BASE if palabras is None else palabras
    _cache = (time.monotonic(), texto(palabras), len(palabras))
    return _cache[1], _cache[2]


def prompt_actual() -> tuple[str, int]:
    """El prompt completo que lee la IA: reglas + vocabulario + campos."""
    t, n = texto_prompt()
    return lector.prompt(t), n


def siembra_base(db: Session) -> int:
    """Una sola vez (migrar_bot.py): pasa las palabras del prompt viejo a la tabla. Si una ya estaba (quitada o
    rechazada), queda activa como base. Idempotente: si ya hay base, no hace nada (lo que el dueño quite, quitado queda)."""
    if db.query(PalabraIA.id).filter(PalabraIA.origen == "base").first():
        return 0
    n = 0
    for palabra, significa, ejemplo in BASE:
        fila = db.query(PalabraIA).filter(PalabraIA.palabra == palabra).first()
        if fila is None:
            fila = PalabraIA(palabra=palabra)
            db.add(fila)
        fila.significa, fila.estado, fila.origen = significa, "activa", "base"
        fila.explicacion = fila.explicacion or ejemplo
        fila.decidida_at, n = datetime.now(timezone.utc), n + 1
    db.commit()
    invalidar()
    return n


# ─────────────────────────────── 2. la lista y lo que se decide ───────────────────────────────
def lista(db: Session) -> dict[str, Any]:
    filas = db.query(PalabraIA).filter(PalabraIA.estado.in_(("activa", "propuesta"))).order_by(PalabraIA.id).all()
    ultima = db.query(BusquedaVocabulario).order_by(BusquedaVocabulario.id.desc()).first()
    return {"activas": [_fila(p) for p in filas if p.estado == "activa"],
            "propuestas": [_fila(p) for p in filas if p.estado == "propuesta"],
            "significados": {k: v[0] for k, v in SIGNIFICADOS.items()},
            "ultima_busqueda": ultima.created_at.isoformat() if ultima and ultima.created_at else None}


class VocabularioInvalido(ValueError):
    pass


def _valida(significa: str | None, explicacion: str | None) -> str | None:
    if significa not in SIGNIFICADOS:
        raise VocabularioInvalido("Escoge qué significa la palabra.")
    return (explicacion or "").strip()[:200] or None


def agregar(db: Session, palabra: str, significa: str, explicacion: str | None, por: str | None) -> dict[str, Any]:
    """Agrega una palabra. Si ya existe (en cualquier estado) NO se duplica: queda activa con lo nuevo."""
    p = norm_palabra(palabra)
    if not _PALABRA.match(p):
        raise VocabularioInvalido("Escribe la palabra (hasta 40 letras).")
    ejemplo = _valida(significa, explicacion)
    fila = db.query(PalabraIA).filter(PalabraIA.palabra == p).first()
    if fila is None:
        fila = PalabraIA(palabra=p, origen="manual")
        db.add(fila)
    fila.significa, fila.estado = significa, "activa"
    fila.explicacion = ejemplo or fila.explicacion
    fila.por, fila.decidida_at = (por or "")[:120] or None, datetime.now(timezone.utc)
    db.commit()
    invalidar()
    return lista(db)


def editar(db: Session, palabra_id: int, significa: str, explicacion: str | None, por: str | None) -> dict[str, Any]:
    """Cambiar el significado o el ejemplo de una aprobada o de una propuesta (antes de aceptarla)."""
    fila = db.get(PalabraIA, palabra_id)
    if fila is None or fila.estado not in ("activa", "propuesta"):
        raise VocabularioInvalido("Esa palabra ya cambió; recarga la pantalla.")
    fila.significa, fila.explicacion = significa, _valida(significa, explicacion)
    fila.por = (por or "")[:120] or fila.por
    db.commit()
    invalidar()
    return lista(db)


def decide(db: Session, palabra_id: int, accion: str, por: str | None) -> dict[str, Any]:
    """aceptar (propuesta → activa) · rechazar (propuesta → rechazada, no vuelve) · quitar (activa → quitada)."""
    fila = db.get(PalabraIA, palabra_id)
    nuevo = {"aceptar": ("propuesta", "activa"), "rechazar": ("propuesta", "rechazada"),
             "quitar": ("activa", "quitada")}.get(accion)
    if fila is None or nuevo is None or fila.estado != nuevo[0]:
        raise VocabularioInvalido("Esa palabra ya cambió; recarga la pantalla.")
    fila.estado, fila.por, fila.decidida_at = nuevo[1], (por or "")[:120] or None, datetime.now(timezone.utc)
    if accion == "aceptar" and fila.evidencia:         # los casos que la explican ya están atendidos
        jobs = [str(j).strip().upper() for j in json.loads(fila.evidencia)]
        regs = db.query(registrosSchemma).filter(registrosSchemma.job_name.in_(jobs)).all()
        marca_revisados(db, [r.id for r in regs], True, guardar=False)
    db.commit()
    invalidar()
    return lista(db)


def marca_revisados(db: Session, registro_ids: list[int], revisado: bool, guardar: bool = True) -> int:
    """«Lo que leyó distinto»: pasa los casos a Revisados (o los devuelve). No cambia el acierto: solo la lista."""
    ids = [m for (m,) in db.query(registrosSchemma.mensaje_id).filter(
        registrosSchemma.id.in_(registro_ids), registrosSchemma.mensaje_id.isnot(None)).all()]
    if ids:
        db.query(MensajeBot).filter(MensajeBot.id.in_(ids)).update(
            {MensajeBot.revisado_at: datetime.now(timezone.utc) if revisado else None}, synchronize_session=False)
    if guardar:
        db.commit()
    return len(ids)


# ─────────────────────────────── 3. proponer palabras nuevas ───────────────────────────────
PROMPT_PROPONER = """Eres el asistente de un negocio de cerrajería. Una IA lee los mensajes de cada trabajo y una persona
corrigió lo que leyó. Te paso cada caso: el final del mensaje, el campo, lo que leyó la IA y cómo quedó.

Busca PALABRAS o ABREVIATURAS del mensaje que expliquen la corrección. Ejemplo: el mensaje termina «260$ 10$ keys»,
la IA leyó partes del técnico 0 y quedó 10 → «keys» significa partes del técnico.

Reglas:
- Propón solo palabras que APARECEN en el mensaje y que explican la corrección. Si la corrección no se explica por una
  palabra (la persona cambió un valor por su cuenta), no propongas nada para ese caso.
- «significa» es uno de: {significados}.
- NO propongas ninguna de estas, ya están decididas: {conocidas}.
- Una palabra, una vez (junta los jobs que la muestran).

Devuelve SOLO JSON: {{"propuestas": [{{"palabra": "keys", "significa": "partes_tecnico",
"explicacion": "«10$ keys» = 10 de partes del técnico", "jobs": ["JT6C2"]}}]}}"""

Pide = Callable[[str, str], tuple[dict, dict]]     # (instrucciones, casos) → (json, uso)


def _pide_ia(instrucciones: str, casos: str) -> tuple[dict, dict]:
    from app import controllers      # perezoso: controllers importa este módulo
    r = controllers.client.chat.completions.create(
        model=controllers.MODELO_LECTOR, max_completion_tokens=3000,
        messages=[{"role": "system", "content": instrucciones}, {"role": "user", "content": casos}])
    uso = {"tokens_entrada": getattr(r.usage, "prompt_tokens", 0) or 0,
           "tokens_salida": getattr(r.usage, "completion_tokens", 0) or 0}
    crudo = re.sub(r"```json|```", "", r.choices[0].message.content or "").strip()
    return json.loads(crudo or "{}"), uso


def toca(db: Session) -> bool:
    ultima = db.query(BusquedaVocabulario).order_by(BusquedaVocabulario.id.desc()).first()
    if ultima is None or ultima.created_at is None:
        return True
    cuando = ultima.created_at if ultima.created_at.tzinfo else ultima.created_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - cuando >= CADA


def proponer(db: Session, pide: Pide | None = None) -> dict[str, Any]:
    """Revisa los trabajos validados y corregidos desde la última búsqueda; propone palabras. Una sola a la vez: si
    ya hay otra corriendo, no hace nada ({"ocupado": True})."""
    if not _busqueda.acquire(blocking=False):
        return {"revisados": 0, "propuestas": 0, "ocupado": True}
    try:
        return _proponer(db, pide or _pide_ia)
    finally:
        _busqueda.release()


def _proponer(db: Session, pide: Pide) -> dict[str, Any]:
    ultima = db.query(BusquedaVocabulario).order_by(BusquedaVocabulario.id.desc()).first()
    desde = ultima.hasta_registro if ultima else 0
    regs = (db.query(registrosSchemma)
            .filter(registrosSchemma.id > desde, registrosSchemma.mensaje_id.isnot(None),
                    registrosSchemma.validacion.is_(None))     # validado = definitivo
            .order_by(registrosSchemma.id).all())
    hasta = max([desde] + [r.id for r in regs])
    ms = lectura_ia._mensajes(db, regs)
    casos, textos = [], {}
    for r in regs:
        m = ms.get(r.mensaje_id)
        ia = lectura_ia._ia(m)
        if ia is None:
            continue
        mal = [f for f in lectura_ia.fallos(r, ia) if f.get("quien") != "codigo"]
        if not mal:
            continue
        textos[(r.job_name or "").strip().upper()] = lector.norm(m.texto)
        casos.append(f"- job {r.job_name}: «…{lector.norm(m.texto)[-160:]}» · " +
                     "; ".join(f"{f['campo']}: leyó {f['leyo']} → quedó {f['quedo']}" for f in mal))
    casos = casos[-MAX_EJEMPLOS:]
    nuevas, costo = 0, 0.0
    if casos:
        conocidas = {p for (p,) in db.query(PalabraIA.palabra).all()} | {p for p, _, _ in BASE}
        instrucciones = PROMPT_PROPONER.format(significados=", ".join(SIGNIFICADOS),
                                               conocidas=", ".join(f"«{x}»" for x in sorted(conocidas)))
        try:
            salida, uso = pide(instrucciones, "\n".join(casos))
        except Exception as e:      # noqa: BLE001 — si la IA falla, se intenta la semana siguiente
            print(f"[vocabulario] la IA no respondió: {e}")
            return {"revisados": len(casos), "propuestas": 0, "error": True}
        from app.servicio_bot import costo as costo_de
        costo = costo_de(uso)
        for x in (salida or {}).get("propuestas", [])[:10]:
            p, sig = norm_palabra(str(x.get("palabra", ""))), x.get("significa")
            jobs = [str(j).strip().upper() for j in (x.get("jobs") or [])][:10]
            # Solo si de verdad está en alguno de esos mensajes: la IA no inventa palabras.
            aparece = any(re.search(rf"(?<![a-z0-9]){re.escape(p)}(?![a-z0-9])", textos.get(j, "")) for j in jobs)
            if not _PALABRA.match(p) or sig not in SIGNIFICADOS or not aparece or p in conocidas:
                continue
            try:
                with db.begin_nested():     # el índice único es la última defensa contra un duplicado
                    db.add(PalabraIA(palabra=p, significa=sig, explicacion=str(x.get("explicacion") or "")[:200] or None,
                                     estado="propuesta", origen="propuesta", evidencia=json.dumps(jobs)))
            except IntegrityError:
                continue
            conocidas.add(p)
            nuevas += 1
    db.add(BusquedaVocabulario(hasta_registro=hasta, revisados=len(casos), propuestas=nuevas, costo_usd=costo))
    db.commit()
    return {"revisados": len(casos), "propuestas": nuevas}


def proponer_si_toca(sesion: Callable[[], Session] | None = None) -> None:
    """Para el segundo plano de Lectura de la IA: busca una vez por semana. Nunca lanza."""
    if sesion is None:
        from app.db import SessionLocal
        sesion = SessionLocal
    db = sesion()
    try:
        if toca(db):
            proponer(db)
    except Exception as e:      # noqa: BLE001
        print(f"[vocabulario] la búsqueda semanal falló: {e}")
    finally:
        db.close()
