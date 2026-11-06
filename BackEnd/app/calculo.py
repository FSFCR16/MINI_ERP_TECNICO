"""
EL CÁLCULO DEL TOTAL EN EL SERVIDOR (plan del bot, fase 2 · 2026-11-06).

Es la fórmula del panel (`FrontEnd/src/Utils/api.js` → `procesarData`, `actualizarPorcentajeCC`) traducida LÍNEA A LÍNEA,
con las operaciones en el mismo orden y el redondeo de JavaScript (`Number(x.toFixed(2))`), para que dé EXACTAMENTE el
mismo número. El panel sigue calculando al instante; al guardar, el servidor recalcula con esta y su total es el que vale.
Lo usan también el bot, los resúmenes y el Excel.

🔴 Si se cambia la fórmula del panel, hay que cambiar esta igual: `tests/test_calculo_paridad.py` compara las dos en
miles de casos generados CON la del panel (`tests/paridad/genera_casos.mjs`) y falla si el archivo del panel cambió y
los casos no se regeneraron.

Las reglas son las del dueño (intencionales, confirmadas el 2026-11-06), incluidas las ramas que no ponen total (la fila
se queda con el que traía) y que MIXTO no aplica el mínimo.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any


def formatear_numero(num: float) -> float:
    """`Number.isInteger(num) ? num : Number(num.toFixed(2))`. toFixed redondea la MAGNITUD «la mitad hacia arriba»
    sobre el valor binario exacto: lo mismo que Decimal(num) con ROUND_HALF_UP."""
    if float(num).is_integer():
        return num
    return float(Decimal(num).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _cash(p: dict[str, Any]) -> dict[str, Any]:
    porcentaje_t = p["porcentaje_tecnico"]
    porcentaje_gil = 100 - porcentaje_t
    valor_real = p["valor_servicio"] - p["partes_tecnico"] - p["partes_gil"]
    minimo_tecnico = valor_real * (porcentaje_t / 100)
    mini_gil = valor_real * (porcentaje_gil / 100)
    if p["tech"] != 0:
        return {**p, "total": formatear_numero(valor_real - p["tech"] + p["adicional_dolar"] + p["partes_gil"])}
    if p["valor_servicio"] <= p["minimo"] + 25 and p["tipo_pago"] != "MIXTO":
        return {**p, "total": formatear_numero((valor_real / 2) + p["adicional_dolar"])}
    if minimo_tecnico > p["minimo"] or p["tipo_pago"] == "MIXTO":
        return {**p, "total": formatear_numero(mini_gil + p["partes_gil"] + p["adicional_dolar"])}
    if 0 < minimo_tecnico <= p["minimo"]:
        return {**p, "total": formatear_numero((valor_real - p["minimo"]) + p["adicional_dolar"] + p["partes_gil"])}
    return p


def _cc(p: dict[str, Any]) -> dict[str, Any]:
    porcentaje_t = p["porcentaje_tecnico"]
    valor_real_tarjeta = p["valor_servicio"] - p["porcentaje_cc"] - p["partes_tecnico"] - p["partes_gil"]
    proceso_tecnico = valor_real_tarjeta * (porcentaje_t / 100)
    if p["tech"] != 0:
        return {**p, "total": formatear_numero((p["tech"] - p["porcentaje_cc"] + p["partes_tecnico"] - p["adicional_dolar"]) * -1)}
    if p["valor_servicio"] <= p["minimo"] + 25 and p["tipo_pago"] != "MIXTO":
        return {**p, "total": formatear_numero(((valor_real_tarjeta / 2) - p["adicional_dolar"] + p["partes_tecnico"]) * -1)}
    if proceso_tecnico > p["minimo"] or p["tipo_pago"] == "MIXTO":
        return {**p, "total": formatear_numero((proceso_tecnico + p["partes_tecnico"] - p["adicional_dolar"]) * -1)}
    if 0 < proceso_tecnico <= p["minimo"]:
        return {**p, "total": formatear_numero(
            (p["minimo"] - p["porcentaje_cc"] + p["partes_tecnico"] - p["partes_gil"] - p["adicional_dolar"]) * -1)}
    return p


def _cc_como_cash(p: dict[str, Any]) -> dict[str, Any]:
    original = p["valor_servicio"]
    resultado = _cash({**p, "valor_servicio": p["valor_servicio"] - p["porcentaje_cc"]})
    return {**resultado, "valor_servicio": original}


def _mixto(p: dict[str, Any]) -> dict[str, Any]:
    cash_p = {**p, "valor_servicio": p["valor_efectivo"]}
    cc_p = {**p, "valor_servicio": p["valor_tarjeta"], "adicional_dolar": 0, "partes_gil": 0, "partes_tecnico": 0}
    valor_cash = _cash(cash_p)
    valor_cc = _cc_como_cash({**cc_p, "valor_servicio": p["valor_tarjeta"]}) if p.get("is_cash") is True else _cc(cc_p)
    return {**p, "total": valor_cash["total"] + valor_cc["total"]}   # el panel NO redondea esta suma


def procesar(data: dict[str, Any]) -> dict[str, Any]:
    """`procesarData` del panel: la fila con su `total`."""
    d = dict(data)
    if d.get("aplica_dolar_empresa") == "SI":
        d["adicional_dolar"] = d.get("dolar_adicional_empresa")
    tipo = str(d["tipo_pago"]).lower()
    if tipo == "cc" and d.get("is_cash") is True:
        return _cc_como_cash(d)
    if tipo == "cc":
        return _cc(d)
    if tipo == "mixto":
        return _mixto(d)
    return _cash(d)


def porcentaje_cc(row: dict[str, Any]) -> dict[str, Any]:
    """`actualizarPorcentajeCC` del panel: la comisión de tarjeta en pesos (dólares), sobre el servicio (CC) o lo
    pagado con tarjeta (MIXTO). Solo si hay porcentaje base y servicio."""
    tipo = str(row.get("tipo_pago") or "").lower()
    base_pct = row.get("porcentaje_cc_base")
    if tipo in ("cc", "mixto") and base_pct is not None and row["valor_servicio"] > 0:
        base = row["valor_tarjeta"] if tipo == "mixto" else row["valor_servicio"]
        return {**row, "porcentaje_cc": formatear_numero(base * (base_pct / 100))}
    return row
