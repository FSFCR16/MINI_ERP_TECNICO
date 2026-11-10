"""
tests/test_correccion.py — D-350: corregir un trabajo desde el chat = EDITARLO como está.

Lo que pasó el 2026-11-08 con DCBAV (AFIK NM): cada corrección volvía a leer el mensaje original y deshacía la
anterior (partes Gil 0 → 12 → 0 → 12), «porcentaje de la tarjeta 12» acababa en partes de Gil y «cc como cash»
cambiaba el pago a CASH. Aquí se prueba que eso ya no pasa.
"""

import pytest

from app import correccion, servicio_bot
from app.db import SessionLocal
from tests.test_bot import CASH300, _reg, _tanda, tecnicos  # noqa: F401 — los técnicos de prueba

CC300 = {"job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CC"}


def _nuevo(clave, datos):
    t = _tanda([{"texto": clave, "wamid": f"w-{clave}"}], {clave: datos}, tecnico_tanda="AFIK")
    return t["resultados"][0]["registro"]["id"]


def _edita(rid, texto, interprete=None):
    db = SessionLocal()
    try:
        return servicio_bot.edita_por_id(db, rid, texto, interprete or _no_llamar)
    finally:
        db.close()


def _no_llamar(texto, fila):
    raise AssertionError(f"la IA no debía llamarse para «{texto}»")


# ── el código entiende las frases de siempre (sin IA) ──
@pytest.mark.parametrize("texto,esperado", [
    ("Partes Gil 0", {"partes_gil": 0}),
    ("las partes de Gil es 0", {"partes_gil": 0}),
    ("$40 cp", {"partes_gil": 40}),
    ("cp 40", {"partes_gil": 40}),
    ("partes del tecnico 20", {"partes_tecnico": 20}),
    ("20p", {"partes_tecnico": 20}),
    ("Porcentaje de la tarjeta 12", {"porcentaje_cc": 12}),
    ("El porcentaje cc es 12", {"porcentaje_cc": 12}),
    ("comisión tarjeta 12.5", {"porcentaje_cc": 12.5}),
    ("Cc como cash", {"is_cash": True}),
    ("Activa la opción cc como cash", {"is_cash": True}),
    ("quita cc como cash", {"is_cash": False}),
    ("son 320 cash", {"valor_servicio": 320, "tipo_pago": "CASH"}),
    ("son 320", {"valor_servicio": 320}),
    ("100 to tech", {"tech": 100}),
    ("partes 0", {"partes": 0}),
    ("partes gil 0 y comision tarjeta 12", {"partes_gil": 0, "porcentaje_cc": 12}),
])
def test_el_codigo_entiende(texto, esperado):
    assert correccion.por_codigo(texto) == esperado


def test_lo_que_el_codigo_no_entiende_va_entero_a_la_ia():
    # una parte que el código no entiende → todo a la IA (nada a medias). «ccf» ya lo entiende: tests/test_lector.py
    assert correccion.por_codigo("la comision quedo en doce y las partes de Gil es 0") is None
    assert correccion.por_codigo("gracias") is None


def test_las_correcciones_se_acumulan_y_no_tocan_lo_demas():
    rid = _nuevo("acum-1", {**CC300, "job_name": "ACUM-1", "parts_gil": 12})
    r1 = _edita(rid, "Partes Gil 0")
    assert r1["estado"] == "creado" and r1["ficha"]["partes_gil"] == 0
    r2 = _edita(rid, "Porcentaje de la tarjeta 12")
    reg = _reg(rid)
    assert (reg.partes_gil, reg.porcentaje_cc, reg.tipo_pago) == (0, 12, "CC")      # la primera sigue
    assert [c["campo"] for c in r2["cambios"] if c["campo"] != "total"] == ["comisión tarjeta"]


def test_cc_como_cash_prende_el_check_y_no_cambia_el_pago():
    rid = _nuevo("ccc-1", {**CC300, "job_name": "CCC-1"})
    r = _edita(rid, "Activa la opción cc como cash")
    reg = _reg(rid)
    assert reg.is_cash is True and reg.tipo_pago == "CC"
    assert {c["campo"] for c in r["cambios"]} >= {"cc como cash"} and "pago" not in {c["campo"] for c in r["cambios"]}
    db = SessionLocal()
    assert servicio_bot.restaura(db, rid, r["antes"])["estado"] == "restaurado"      # [Deshacer]
    db.close()
    assert _reg(rid).is_cash is False


def test_partes_sin_decir_de_quien():
    solo_gil = _nuevo("par-1", {**CC300, "job_name": "PAR-1", "parts_gil": 30})
    assert _edita(solo_gil, "partes 10")["ficha"]["partes_gil"] == 10                # solo Gil tenía: es de Gil
    ninguna = _nuevo("par-2", {**CC300, "job_name": "PAR-2"})
    r = _edita(ninguna, "partes 10")
    assert r["estado"] == "ambiguo" and r["valor"] == 10                             # se pregunta, no se adivina
    assert _reg(ninguna).partes_gil == 0 and _reg(ninguna).partes_tecnico == 0


def test_la_ia_solo_traduce_a_campos_de_la_lista():
    rid = _nuevo("ia-1", {**CC300, "job_name": "IA-1", "parts_gil": 12})

    def ia(texto, fila):
        assert fila["partes_gil"] == 12                                                  # ve la ficha actual
        return [{"campo": "porcentaje_cc", "valor": "12"}, {"campo": "partes_gil", "valor": 0},
                {"campo": "total", "valor": 999}, {"campo": "inventado", "valor": 1},
                {"campo": "tech", "valor": -5}], {"tokens_entrada": 500, "tokens_salida": 50}
    r = _edita(rid, "la comision quedo en doce y gil no puso partes", ia)
    reg = _reg(rid)
    assert (reg.porcentaje_cc, reg.partes_gil, reg.tech) == (12, 0, 0)               # lo raro se descartó
    assert reg.total != 999 and r["estado"] == "creado"


def test_si_no_entiende_nada_no_cambia_nada():
    rid = _nuevo("nada-1", {**CASH300, "job_name": "NADA-1"})
    r = _edita(rid, "esto no dice nada útil", lambda t, f: ([], {}))
    assert r["estado"] == "sin_cambios" and _reg(rid).valor_servicio == 300


def test_cambiar_el_valor_vuelve_a_sacar_la_comision_del_contrato():
    rid = _nuevo("com-1", {**CC300, "job_name": "COM-1"})
    assert _reg(rid).porcentaje_cc == 9                                              # 3 % de 300
    _edita(rid, "son 400")
    assert _reg(rid).porcentaje_cc == 12                                             # 3 % de 400
    _edita(rid, "comision tarjeta 5")
    _edita(rid, "partes gil 10")
    assert _reg(rid).porcentaje_cc == 5                                              # la puesta a mano se queda


def test_cambiar_por_http(cliente, sesion):
    assert cliente.post("/api/bot/trabajos/999999/cambiar", headers=sesion, json={"texto": "partes gil 0"}).json() == \
        {"estado": "no_existe"}
