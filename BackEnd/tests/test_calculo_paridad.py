"""
Plan del bot, fase 2: la fórmula del servidor (`app/calculo.py`) da EXACTAMENTE lo mismo que la del panel
(`FrontEnd/src/Utils/api.js`) en los casos que generó la propia fórmula del panel (`tests/paridad/genera_casos.mjs`):
todas las ramas (cash, CC, CC como cash, mixto, con y sin «to tech»), los bordes (mínimo + 25, la parte del técnico
igual al mínimo), los redondeos en ,xx5 y las mayúsculas del tipo de pago.
"""

import gzip
import hashlib
import json
from collections import Counter
from pathlib import Path

import pytest

from app import calculo

AQUI = Path(__file__).resolve().parent
PANEL = AQUI.parents[1] / "FrontEnd" / "src" / "Utils" / "api.js"
DATOS = json.loads(gzip.decompress((AQUI / "paridad" / "casos.json.gz").read_bytes()))


def _igual(a, b) -> bool:
    if a is None or b is None:
        return a is b
    return float(a) == float(b)          # exacto: sin tolerancia (-0 y 0 son iguales, como en el panel)


def test_los_casos_son_de_la_formula_actual_del_panel():
    """Si se cambió la fórmula del panel, hay que cambiar la del servidor y regenerar los casos."""
    huella = hashlib.sha256(PANEL.read_bytes()).hexdigest()
    assert huella == DATOS["huella_panel"], (
        "La fórmula del panel (Utils/api.js) cambió: actualiza app/calculo.py igual y corre "
        "`node tests/paridad/genera_casos.mjs`.")


def test_hay_bastantes_casos_y_cubren_todas_las_ramas():
    casos = DATOS["casos"]
    assert len(casos) > 20000 and len(DATOS["comisiones"]) >= 3000
    tipos = Counter(c["entrada"]["tipo_pago"] for c in casos)
    assert all(tipos[t] > 1000 for t in ("CASH", "CC", "MIXTO"))
    assert sum(1 for c in casos if c["entrada"]["tech"] != 0) > 2000           # con «to tech»
    assert sum(1 for c in casos if c["entrada"]["is_cash"]) > 3000             # CC como cash
    assert sum(1 for c in casos if c["entrada"]["aplica_dolar_empresa"] == "SI") > 3000
    assert sum(1 for c in casos if c["salida"]["total"] == c["entrada"]["total"]) > 100   # ramas sin total


def test_el_total_es_identico_en_todos_los_casos():
    fallos = []
    for i, c in enumerate(DATOS["casos"]):
        r = calculo.procesar(dict(c["entrada"]))
        for k in ("total", "valor_servicio", "adicional_dolar"):
            if not _igual(r.get(k), c["salida"].get(k)):
                fallos.append((i, k, r.get(k), c["salida"].get(k), c["entrada"]))
                break
    assert not fallos, f"{len(fallos)} casos distintos; el primero: {fallos[0]}"


def test_la_comision_de_tarjeta_es_identica():
    fallos = [(c["entrada"], calculo.porcentaje_cc(dict(c["entrada"])).get("porcentaje_cc"), c["salida"]["porcentaje_cc"])
              for c in DATOS["comisiones"]
              if not _igual(calculo.porcentaje_cc(dict(c["entrada"])).get("porcentaje_cc"), c["salida"]["porcentaje_cc"])]
    assert not fallos, f"{len(fallos)} comisiones distintas; la primera: {fallos[0]}"


@pytest.mark.parametrize("x,esperado", [(1.005, 1.0), (2.675, 2.67), (1.015, 1.01), (0.125, 0.13), (10.0, 10.0),
                                         (-1.555, -1.55), (123.456, 123.46), (-0.004, -0.0)])
def test_el_redondeo_es_el_de_javascript(x, esperado):
    """toFixed(2) redondea sobre el valor binario exacto (1.005 es 1.00499… → 1.00), no «a par»."""
    assert calculo.formatear_numero(x) == esperado


def test_casos_a_mano_que_entiende_una_persona():
    base = dict(valor_tarjeta=0, valor_efectivo=0, porcentaje_cc=0, partes_gil=0, partes_tecnico=0, tech=0,
                adicional_dolar=2.5, aplica_dolar_empresa="NO", dolar_adicional_empresa=0, is_cash=False, total=0)
    # CASH sobre el mínimo: a Gil le toca su % del servicio (+ adicional): 300 × 50 % + 2,5
    assert calculo.procesar({**base, "tipo_pago": "CASH", "valor_servicio": 300, "porcentaje_tecnico": 50, "minimo": 50})["total"] == 152.5
    # CASH con servicio ≤ mínimo + 25: mitad y mitad (+ adicional)
    assert calculo.procesar({**base, "tipo_pago": "CASH", "valor_servicio": 70, "porcentaje_tecnico": 60, "minimo": 50})["total"] == 37.5
    # CC: Gil tiene la plata y le debe al técnico (negativo): (300 − 9 de comisión) × 50 % − 2,5
    cc = calculo.procesar({**base, "tipo_pago": "CC", "valor_servicio": 300, "porcentaje_cc": 9, "porcentaje_tecnico": 50, "minimo": 50})
    assert cc["total"] == -143.0
    # «Dólar empresa» en SÍ reemplaza el adicional
    assert calculo.procesar({**base, "tipo_pago": "CASH", "valor_servicio": 300, "porcentaje_tecnico": 50, "minimo": 50,
                             "aplica_dolar_empresa": "SI", "dolar_adicional_empresa": 5})["total"] == 155.0
