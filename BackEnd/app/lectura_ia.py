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
            salida.append({"clave": campo, "campo": nombre, "leyo": ia.get(kia), "quedo": getattr(reg, campo),
                           "quien": "ia"})
    # La comisión la pone el CÓDIGO («ccf N»), no la IA: si quedó distinta, es error de la regla (24CPT, 2026-11-16:
    # «K 211$ Ccf 8$» puso 211 y no salía en ninguna parte). Se muestra, pero no cuenta en el acierto de la IA (D-381).
    if ia.get("ccf") is not None and not mismo(reg.porcentaje_cc, ia.get("ccf"), "porcentaje_cc"):
        salida.append({"clave": "porcentaje_cc", "campo": "comisión tarjeta", "leyo": ia.get("ccf"),
                       "quedo": reg.porcentaje_cc, "quien": "codigo"})
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


def mal_leidos(db: Session, regs: list[registrosSchemma], limite: int = 300) -> list[dict[str, Any]]:
    """Los trabajos que la IA leyó distinto, del más nuevo al más viejo (la lista de «Lectura de la IA»). `revisado`:
    alguien ya lo vio (D-382); la pantalla los separa en «Por revisar» y «Revisados». No cambia el acierto."""
    lecturas = por_trabajo(db, regs)
    vistos = {m.id for m in _mensajes(db, regs).values() if m.revisado_at}
    salida = []
    for r in sorted(regs, key=lambda x: -x.id):
        if r.id in lecturas:
            salida.append({"id": r.id, "job_name": (r.job_name or "").strip(), "tecnico": r.nombre,
                           "semana": r.semana.semana if r.semana else None,
                           "por_validar": r.validacion == POR_VALIDAR, "revisado": r.mensaje_id in vistos,
                           **lecturas[r.id]})
            if len(salida) >= limite:
                break
    return salida


def resumen(db: Session, regs: list[registrosSchemma]) -> dict[str, Any]:
    """Acierto de la IA sobre trabajos DEFINITIVOS (no los de «Por validar») que nacieron de un mensaje."""
    ms = _mensajes(db, regs)
    leidos, bien, por_campo, del_codigo = 0, 0, Counter(), 0
    for r in regs:
        if r.validacion == POR_VALIDAR or not r.mensaje_id:
            continue
        ia = _ia(ms.get(r.mensaje_id))
        if ia is None:
            continue
        leidos += 1
        todos = fallos(r, ia)
        f = [x for x in todos if x.get("quien") != "codigo"]     # el acierto es de la IA: lo del código va aparte
        del_codigo += len(todos) - len(f)
        bien += not f
        por_campo.update(x["campo"] for x in f)
    return {"leidos": leidos, "bien": bien, "acierto": round(bien * 100 / leidos) if leidos else None,
            "falla_mas": [{"campo": c, "veces": n} for c, n in por_campo.most_common(3)],
            "errores_codigo": del_codigo}
