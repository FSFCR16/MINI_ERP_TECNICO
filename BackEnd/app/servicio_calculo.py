"""
EL SERVIDOR MANDA EN EL TOTAL (plan del bot, fase 2 · 2026-11-06).

Al guardar (panel o bot), el total se recalcula aquí con `calculo.procesar` —la misma fórmula del panel— y ESE es el que
queda. La entrada se arma como la arma el panel (`procesarDatosTecnico` + la fila): lo de la fila, y lo que la fila no
traiga (mínimo, adicional, «dólar empresa») del contrato del técnico. Lo que se usó se GUARDA en la fila, así un trabajo
viejo da siempre el mismo total aunque cambie el contrato.

Si el total que mandó el panel no coincide, gana el del servidor y la diferencia se anota en `diferencias_calculo` con
toda la entrada: es un error de una de las dos fórmulas y ese caso se vuelve una prueba.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app import calculo
from app.models import Trabajo, registrosSchemma
from app.models_bot import DiferenciaCalculo

log = logging.getLogger(__name__)


def _n(v: Any) -> float:
    return float(v) if v is not None else 0.0


def entrada(reg: registrosSchemma, contrato: Trabajo | None) -> dict[str, Any]:
    """Lo que la fórmula necesita, como lo arma el panel. De la fila; si la fila no lo tiene (trabajos de antes), del
    contrato del técnico (lo mismo que hace el panel al reabrir la semana)."""
    c = contrato
    empresa = reg.dolar_adicional_empresa if reg.dolar_adicional_empresa is not None else _n(c.porcentaje_adicional_empresa if c else 0)
    return {
        "tipo_pago": reg.tipo_pago or "CASH",
        "valor_servicio": _n(reg.valor_servicio), "valor_tarjeta": _n(reg.valor_tarjeta),
        "valor_efectivo": _n(reg.valor_efectivo), "porcentaje_cc": _n(reg.porcentaje_cc),
        "partes_gil": _n(reg.partes_gil), "partes_tecnico": _n(reg.partes_tecnico), "tech": _n(reg.tech),
        "porcentaje_tecnico": _n(reg.porcentaje_tecnico if reg.porcentaje_tecnico is not None else (c.porcentaje_tecnico if c else 0)),
        "minimo": _n(reg.minimo if reg.minimo is not None else (c.minimo if c else 0)),
        "adicional_dolar": _n(reg.adicional_dolar if reg.adicional_dolar is not None else (c.adicional_dolar if c else 0)),
        "aplica_dolar_empresa": reg.aplica_dolar_empresa or ("SI" if empresa > 0 else "NO"),
        "dolar_adicional_empresa": empresa,
        "is_cash": bool(reg.is_cash),
        "total": _n(reg.total),
    }


def recalcula(db: Session, reg: registrosSchemma, total_panel: float | None = None) -> float:
    """Pone en la fila el total del servidor y lo que usó. Si `total_panel` vino y no coincide, lo anota.

    🔴 Los trabajos DE ANTES (`origen` NULL) no se recalculan: no guardaron lo que la fórmula usó («CC como cash», el
    dólar empresa, ajustes a mano), y recalcularlos daría otro número (`compara_guardados.py`, 2026-11-06: 1.634 de
    8.054; 1.334 eran «CC como cash»). Siguen como siempre: queda el total que manda el panel o el guardado."""
    if reg.origen is None:
        if total_panel is not None:
            reg.total = float(total_panel)
        return float(reg.total or 0)
    contrato = db.get(Trabajo, reg.tecnico_id) if reg.tecnico_id else None
    e = entrada(reg, contrato)
    # Hay ramas de la fórmula que dejan el total como viene (igual que el panel): ahí se parte del total que el panel
    # tenía en la fila, no del que estaba guardado antes de editar (lo encontró test_recalcula_api_paridad).
    if total_panel is not None:
        e["total"] = float(total_panel)
    total = calculo.procesar(e).get("total")
    total = float(total) if total is not None else 0.0
    if total_panel is not None and float(total_panel) != total:
        log.warning("[calculo] el panel dijo %s y el servidor %s (registro %s)", total_panel, total, reg.id)
        db.add(DiferenciaCalculo(registro_id=reg.id, total_panel=float(total_panel), total_servidor=total,
                                 entrada=json.dumps(e, ensure_ascii=False)))
    reg.total = total
    # Lo que se usó queda guardado (los trabajos de antes lo ganan la primera vez que se tocan).
    reg.minimo, reg.adicional_dolar = e["minimo"], e["adicional_dolar"]
    reg.aplica_dolar_empresa, reg.dolar_adicional_empresa, reg.is_cash = e["aplica_dolar_empresa"], e["dolar_adicional_empresa"], e["is_cash"]
    return total


def fila_respuesta(reg: registrosSchemma) -> dict[str, Any]:
    """Lo que el panel necesita para cuadrar lo que mostró con lo que quedó guardado."""
    return {"id": reg.id, "job": reg.job, "job_name": reg.job_name, "total": reg.total, "porcentaje_cc": reg.porcentaje_cc}
