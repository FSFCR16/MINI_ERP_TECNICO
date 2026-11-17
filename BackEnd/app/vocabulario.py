"""
EL VOCABULARIO DE LA IA (D-381, 2026-11-17) — que la IA aprenda cómo escribe ESTE negocio, sin entrenar nada.

Contractors escribe con sus abreviaturas («10$ keys» = partes del técnico, «100$ t» = to tech, «after fee» = tarjeta) y
la IA no las sabe: en la semana 9-15 nov fueron 10 de los 11 trabajos que alguien tuvo que corregir.

Cómo aprende, con una persona en medio (nada entra solo):
  1. Las palabras `activa` se agregan al FINAL de las instrucciones de la IA en cada lectura (`texto_prompt`). Al
     final y siempre igual: lo de antes no cambia y OpenAI cobra menos lo que se repite idéntico.
  2. Una vez por semana (al abrir Lectura de la IA) o con «Buscar ahora», UNA llamada a la IA revisa los trabajos
     YA VALIDADOS que alguien corrigió y propone palabras (`proponer`). Solo validados: lo «por validar» aún puede
     cambiar. Cuesta menos de un centavo; si no hay corregidos nuevos, no llama.
  3. En Lectura de la IA cualquiera del panel da «Aceptar» (pasa a `activa`) o «Rechazar» (no se vuelve a proponer),
     o agrega una a mano.
Lo exacto (la comisión «ccf N», el % suelto) NO va aquí: lo hace el código (`lector.senales`), gratis y sin fallar.
"""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from sqlalchemy.orm import Session

from app import lectura_ia, lector
from app.models import registrosSchemma
from app.models_bot import BusquedaVocabulario, PalabraIA

# lo que puede significar una palabra → (cómo se le dice al dueño, cómo se le explica a la IA)
SIGNIFICADOS: dict[str, tuple[str, str]] = {
    "partes_tecnico": ("partes del técnico", "el número que la acompaña va en parts_tecnico"),
    "partes_gil": ("partes de Gil", "el número que la acompaña va en parts_gil"),
    "tech": ("pago al técnico (to tech)", "el número que la acompaña va en tech"),
    "tarjeta": ("pagado con tarjeta", "el pago fue con tarjeta: tipo_pago CC (o MIXTO si también hubo cash)"),
    "cash": ("pagado en efectivo", "el pago fue en efectivo: tipo_pago CASH (o MIXTO si también hubo tarjeta)"),
    "valor": ("valor del servicio", "el número que la acompaña es valor_servicio"),
}
CADA = timedelta(days=7)
MAX_EJEMPLOS = 40
_PALABRA = re.compile(r"^[\w$#.\- ]{1,40}$")

_cache: tuple[float, str, int] = (0.0, "", 0)
_VIDA_CACHE_S = 60


def invalidar() -> None:
    global _cache
    _cache = (0.0, "", 0)


def _norm_palabra(p: str) -> str:
    return re.sub(r"\s+", " ", (p or "").strip().lower())


def _fila(p: PalabraIA) -> dict[str, Any]:
    return {"id": p.id, "palabra": p.palabra, "significa": p.significa,
            "significa_texto": SIGNIFICADOS.get(p.significa, (p.significa,))[0], "explicacion": p.explicacion,
            "estado": p.estado, "origen": p.origen, "evidencia": json.loads(p.evidencia) if p.evidencia else [],
            "por": p.por}


# ─────────────────────────────── 1. lo que se le agrega a la IA ───────────────────────────────
def _texto(palabras: list[PalabraIA]) -> str:
    if not palabras:
        return ""
    lineas = [f"- «{p.palabra}»: {SIGNIFICADOS[p.significa][1]}." + (f" Ej.: {p.explicacion}" if p.explicacion else "")
              for p in palabras if p.significa in SIGNIFICADOS]
    return ("\n\n━━━ 7. VOCABULARIO DE ESTE NEGOCIO (aprobado por el dueño; manda sobre lo general) ━━━\n"
            + "\n".join(lineas) + "\n")


def texto_prompt(sesion: Callable[[], Session] | None = None) -> tuple[str, int]:
    """(texto para el final de las instrucciones, cuántas palabras). Se guarda 60 s para no ir a la base en cada
    mensaje de una tanda. Si la base falla, la IA lee sin vocabulario (nunca se frena una lectura por esto)."""
    global _cache
    if time.monotonic() - _cache[0] < _VIDA_CACHE_S:
        return _cache[1], _cache[2]
    try:
        if sesion is None:
            from app.db import SessionLocal
            sesion = SessionLocal
        db = sesion()
        try:
            activas = db.query(PalabraIA).filter(PalabraIA.estado == "activa").order_by(PalabraIA.id).all()
            _cache = (time.monotonic(), _texto(activas), len(activas))
        finally:
            db.close()
    except Exception as e:      # noqa: BLE001 — sin vocabulario se sigue leyendo
        print(f"[vocabulario] no se pudo leer: {e}")
        return "", 0
    return _cache[1], _cache[2]


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


def agregar(db: Session, palabra: str, significa: str, explicacion: str | None, por: str | None) -> dict[str, Any]:
    p = _norm_palabra(palabra)
    if not _PALABRA.match(p) or significa not in SIGNIFICADOS:
        raise VocabularioInvalido("Escribe la palabra (hasta 40 letras) y qué significa.")
    fila = db.query(PalabraIA).filter(PalabraIA.palabra == p).first()
    if fila is None:
        fila = PalabraIA(palabra=p, origen="manual")
        db.add(fila)
    fila.significa, fila.estado = significa, "activa"
    fila.explicacion = (explicacion or "").strip()[:200] or fila.explicacion
    fila.por, fila.decidida_at = (por or "")[:120] or None, datetime.now(timezone.utc)
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
    db.commit()
    invalidar()
    return lista(db)


# ─────────────────────────────── 3. proponer palabras nuevas ───────────────────────────────
PROMPT_PROPONER = """Eres el asistente de un negocio de cerrajería. Una IA lee los mensajes de cada trabajo y una persona
corrigió lo que leyó. Te paso cada caso: el final del mensaje, el campo, lo que leyó la IA y cómo quedó.

Busca PALABRAS o ABREVIATURAS del mensaje que expliquen la corrección. Ejemplo: el mensaje termina «260$ 10$ keys»,
la IA leyó partes del técnico 0 y quedó 10 → «keys» significa partes del técnico.

Reglas:
- Propón solo palabras que APARECEN en el mensaje y que explican la corrección. Si la corrección no se explica por una
  palabra (la persona cambió un valor por su cuenta), no propongas nada para ese caso.
- «significa» es uno de: partes_tecnico, partes_gil, tech, tarjeta, cash, valor.
- No propongas estas, ya decididas: {conocidas}.
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
    """Revisa los trabajos validados y corregidos desde la última búsqueda; propone palabras. {revisados, propuestas}."""
    pide = pide or _pide_ia
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
        cola = lector.norm(m.texto)[-160:]
        textos[(r.job_name or "").strip().upper()] = lector.norm(m.texto)
        casos.append(f"- job {r.job_name}: «…{cola}» · " +
                     "; ".join(f"{f['campo']}: leyó {f['leyo']} → quedó {f['quedo']}" for f in mal))
    casos = casos[-MAX_EJEMPLOS:]
    nuevas, costo = 0, 0.0
    if casos:
        conocidas = sorted({p.palabra for p in db.query(PalabraIA).all()})
        instrucciones = PROMPT_PROPONER.format(conocidas=", ".join(f"«{x}»" for x in conocidas) or "ninguna")
        try:
            salida, uso = pide(instrucciones, "\n".join(casos))
        except Exception as e:      # noqa: BLE001 — si la IA falla, se intenta la semana siguiente
            print(f"[vocabulario] la IA no respondió: {e}")
            return {"revisados": len(casos), "propuestas": 0, "error": True}
        from app.servicio_bot import costo as costo_de
        costo = costo_de(uso)
        for x in (salida or {}).get("propuestas", [])[:10]:
            p, sig = _norm_palabra(str(x.get("palabra", ""))), x.get("significa")
            jobs = [str(j).strip().upper() for j in (x.get("jobs") or [])][:10]
            # Solo si de verdad está en alguno de esos mensajes: la IA no inventa palabras.
            aparece = any(re.search(rf"(?<![a-z0-9]){re.escape(p)}(?![a-z0-9])", textos.get(j, "")) for j in jobs)
            if not _PALABRA.match(p) or sig not in SIGNIFICADOS or not aparece or p in conocidas:
                continue
            db.add(PalabraIA(palabra=p, significa=sig, explicacion=str(x.get("explicacion") or "")[:200] or None,
                             estado="propuesta", origen="propuesta", evidencia=json.dumps(jobs)))
            conocidas.append(p)
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
