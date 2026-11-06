"""
LAS ALERTAS 🟡 «REVISAR» (plan del bot, fase 5 · PLAN_BOT_CHAT.md §7).

El trabajo ENTRA (por validar), pero marcado, para que una persona lo mire antes de aprobarlo. Las 🔴 —las que no dejan
entrar— viven en `servicio_bot.bloqueo`.

Sábados: igual que el panel, el bot NO cambia el porcentaje; solo avisa. Quien valida lo cambia a mano si aplica.
"""

from __future__ import annotations

import re
import statistics
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models import SemanaTecnico, Trabajo, registrosSchemma

MESES_EN = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10,
            "nov": 11, "dec": 12, "ene": 1, "abr": 4, "ago": 8, "dic": 12}


def _n(v) -> float:
    return float(v or 0)


def _num(v: float) -> str:
    return str(int(v)) if float(v).is_integer() else f"{v:.2f}"


def fechas_posibles(texto: str | None, anio: int) -> list[date]:
    """La fecha del mensaje «como aparezca». Puede ser M/D (empresa de EE. UU.) o D/M: se devuelven las dos lecturas
    válidas y quien pregunta decide con las dos."""
    t = (texto or "").strip().lower()
    out: list[date] = []

    def add(a, m, d):
        try:
            out.append(date(a, m, d))
        except ValueError:
            pass

    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", t)
    if m:
        add(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        return out
    m = re.search(r"(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?", t)
    if m:
        a = int(m.group(3)) if m.group(3) else anio
        a = a + 2000 if a < 100 else a
        x, y = int(m.group(1)), int(m.group(2))
        add(a, x, y)          # M/D
        if x != y:
            add(a, y, x)      # D/M
        return out
    m = re.search(r"([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:\D+(\d{4}))?", t) or None
    if m and m.group(1) in MESES_EN:
        add(int(m.group(3)) if m.group(3) else anio, MESES_EN[m.group(1)], int(m.group(2)))
        return out
    m = re.search(r"(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*(?:\D+(\d{4}))?", t)
    if m and m.group(2) in MESES_EN:
        add(int(m.group(3)) if m.group(3) else anio, MESES_EN[m.group(2)], int(m.group(1)))
    return out


def amarillas(db: Session, fila: dict[str, Any], c: Trabajo, semana: SemanaTecnico,
              ia: dict[str, Any] | None = None) -> list[dict[str, str]]:
    """Lista de {codigo, texto}. Vacía = nada que revisar."""
    ia = ia or {}
    al: list[dict[str, str]] = []
    servicio = _n(fila.get("valor_servicio"))
    if servicio < _n(c.minimo):
        al.append({"codigo": "bajo_minimo",
                   "texto": f"El servicio ({_num(servicio)}) está por debajo del mínimo del técnico ({_num(_n(c.minimo))})."})
    partes = _n(fila.get("partes_tecnico")) + _n(fila.get("partes_gil")) + _n(fila.get("tech"))
    if partes > servicio:
        al.append({"codigo": "partes_mayores",
                   "texto": f"Partes y «to tech» ({_num(partes)}) suman más que el servicio ({_num(servicio)})."})
    raro = _fuera_de_lo_normal(db, fila["nombre"], servicio)
    if raro:
        al.append({"codigo": "valor_raro", "texto": raro})
    if not fila.get("job_name"):
        al.append({"codigo": "sin_job", "texto": "No trae el número del job: no se puede revisar si está repetido."})
    fechas = fechas_posibles(ia.get("date"), semana.fecha_inicio.year)
    if fechas:
        dentro = [d for d in fechas if semana.fecha_inicio <= d <= semana.fecha_fin]
        if not dentro:
            al.append({"codigo": "fecha_fuera",
                       "texto": f"La fecha del mensaje ({ia.get('date')}) no cae en la semana elegida."})
        elif all(d.weekday() == 5 for d in dentro) and _n(c.cargo_sabados) != 0:
            al.append({"codigo": "sabado",
                       "texto": f"Parece de sábado: este técnico tiene {_num(_n(c.cargo_sabados))}% los sábados. "
                                f"Si aplica, cambia el porcentaje a mano."})
    if (semana.estado or "abierta") == "cerrada":
        al.append({"codigo": "semana_cerrada", "texto": "La semana ya estaba cerrada."})
    return al


def _fuera_de_lo_normal(db: Session, nombre: str, servicio: float) -> str | None:
    """Comparado con los últimos 60 trabajos del técnico (si tiene al menos 10): más de 4 veces o menos de una quinta
    parte de lo que suele cobrar."""
    valores = [v for (v,) in db.query(registrosSchemma.valor_servicio).filter(registrosSchemma.nombre == nombre,
                                                                               registrosSchemma.valor_servicio > 0)
               .order_by(registrosSchemma.id.desc()).limit(60).all()]
    if len(valores) < 10 or servicio <= 0:
        return None
    mediana = statistics.median(valores)
    if servicio > mediana * 4 or servicio < mediana / 5:
        return f"Valor muy distinto de lo normal para este técnico ({_num(servicio)}; suele ser {_num(mediana)})."
    return None

