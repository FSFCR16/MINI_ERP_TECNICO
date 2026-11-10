"""
¿LA IA LEYÓ BIEN? (2026-11-09) — sin que nadie marque nada.

Cada trabajo que nació de un mensaje (por WhatsApp o pegado en el panel del ERP) queda atado a él (`mensaje_id`), y el
mensaje guarda lo que leyó la IA (`salida_ia`). Comparar esa lectura con cómo QUEDÓ el trabajo dice qué leyó mal: si una
persona cambió el pago, el valor o las partes, es que la IA no lo leyó así. Se compara al vuelo, así que una corrección
hecha después (en el panel, en el chat) se refleja sola.

Solo cuentan los campos que lee la IA. La comisión y el % del técnico los pone el código (`lector.senales`), no la IA.
Lo que espera en «Por validar» todavía no es definitivo: no entra en el acierto (sí se marca si ya se corrigió).
"""

from __future__ import annotations

import json
from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.models import registrosSchemma
from app.models_bot import MensajeBot

# campo del trabajo → (campo que devuelve la IA, cómo se le dice al dueño)
CAMPOS_IA: dict[str, tuple[str, str]] = {
    "tipo_pago": ("tipo_pago", "pago"), "valor_servicio": ("valor_servicio", "valor"),
    "valor_efectivo": ("valor_efectivo", "cash"), "valor_tarjeta": ("valor_tarjeta", "tarjeta"),
    "partes_tecnico": ("parts_tecnico", "partes técnico"), "partes_gil": ("parts_gil", "partes Gil"),
    "tech": ("tech", "to tech"), "job_name": ("job_name", "número"), "job": ("job_type", "job"),
}
POR_VALIDAR = "por_validar"   # el mismo de servicio_bot (que importa este módulo)


def _k(v: Any) -> str:
    return str(v or "").replace(" ", "").upper()


def mismo(final: Any, leido: Any, campo: str) -> bool:
    if campo in ("job_name", "tipo_pago", "job"):
        return _k(final) == _k(leido) or (campo == "job" and _k(final) == "TODO")
    try:
        return round(float(final or 0), 2) == round(float(leido or 0), 2)
    except (TypeError, ValueError):
        return False


def fallos(reg: registrosSchemma, ia: dict[str, Any]) -> list[dict[str, Any]]:
    """Los campos en que el trabajo quedó distinto a lo que leyó la IA. El reparto cash/tarjeta solo cuenta en MIXTO
    (fuera de MIXTO el trabajo lo deja en 0 a propósito)."""
    mixto = _k(reg.tipo_pago) == "MIXTO"
    salida = []
    for campo, (kia, nombre) in CAMPOS_IA.items():
        if campo in ("valor_efectivo", "valor_tarjeta") and not mixto:
            continue
        if not mismo(getattr(reg, campo), ia.get(kia), campo):
            salida.append({"clave": campo, "campo": nombre, "leyo": ia.get(kia), "quedo": getattr(reg, campo)})
    return salida


def _mensajes(db: Session, regs: list[registrosSchemma]) -> dict[int, MensajeBot]:
    ids = {r.mensaje_id for r in regs if r.mensaje_id}
    return {m.id: m for m in db.query(MensajeBot).filter(MensajeBot.id.in_(ids)).all()} if ids else {}


def _ia(m: MensajeBot | None) -> dict[str, Any] | None:
    try:
        ia = json.loads(m.salida_ia) if m and m.salida_ia else None
    except ValueError:
        return None
    return ia if isinstance(ia, dict) and ia else None


def por_trabajo(db: Session, regs: list[registrosSchemma]) -> dict[int, dict[str, Any]]:
    """Para el puntico: {id del trabajo: {"texto": mensaje, "fallos": [...]}} SOLO de los que la IA leyó mal."""
    ms = _mensajes(db, regs)
    salida = {}
    for r in regs:
        m = ms.get(r.mensaje_id) if r.mensaje_id else None
        ia = _ia(m)
        if ia is None:
            continue
        f = fallos(r, ia)
        if f:
            salida[r.id] = {"texto": (m.texto or "")[:600], "fallos": f}
    return salida


def resumen(db: Session, regs: list[registrosSchemma]) -> dict[str, Any]:
    """Acierto de la IA sobre trabajos DEFINITIVOS (no los de «Por validar») que nacieron de un mensaje."""
    ms = _mensajes(db, regs)
    leidos, bien, por_campo = 0, 0, Counter()
    for r in regs:
        if r.validacion == POR_VALIDAR or not r.mensaje_id:
            continue
        ia = _ia(ms.get(r.mensaje_id))
        if ia is None:
            continue
        leidos += 1
        f = fallos(r, ia)
        bien += not f
        por_campo.update(x["campo"] for x in f)
    return {"leidos": leidos, "bien": bien, "acierto": round(bien * 100 / leidos) if leidos else None,
            "falla_mas": [{"campo": c, "veces": n} for c, n in por_campo.most_common(3)]}
