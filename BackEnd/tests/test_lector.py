"""tests/test_lector.py — leer un ticket (2026-11-09): el código clasifica el pago y aplica las reglas exactas del dueño;
a la IA le llega la parte general + solo el bloque de ese pago. Nada sale a OpenAI."""

import json
from types import SimpleNamespace

import pytest

from app import controllers, correccion, lector
from tests.test_bot import _reg, _tanda, tecnicos  # noqa: F401 — los técnicos de prueba (AFIK LOCKOUT: 50 %, cc 3 %)
from tests.test_correccion import _edita, _nuevo

CC300 = {"job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CC"}


@pytest.mark.parametrize("texto,campo,valor", [
    ("300 cc 40%", "porcentaje_tecnico", 40),
    ("300 cc 40 %", "porcentaje_tecnico", 40),
    ("300 cc", "porcentaje_tecnico", None),
    ("300 cc 40% 50%", "porcentaje_tecnico", None),        # dos distintos: no se adivina
    ("300 cc no fee", "sin_fee", True),
    ("300 cc nofee", "sin_fee", True),
    ("300 cc sin fee", "sin_fee", True),
    ("300 cc without fee", "sin_fee", True),
    ("300 cc fee free", "sin_fee", True),
    ("300 cc", "sin_fee", False),
    ("300 zelle", "sin_fee", True),
    ("300 cc ccf 13", "ccf", 13),
    ("300 cc ccf13", "ccf", 13),
    ("300 cc 13 ccf", "ccf", 13),
    ("300 cc $13 ccf", "ccf", 13),
    ("300 cc ccf 12.5", "ccf", 12.5),
    ("300 cc", "ccf", None),
])
def test_las_senales_del_dueno(texto, campo, valor):
    assert lector.senales(texto)[campo] == valor


def test_la_comision_ccf_manda_luego_no_fee_luego_el_contrato():
    assert lector.comision({"ccf": 13, "sin_fee": True}, 9) == 13
    assert lector.comision({"ccf": None, "sin_fee": True}, 9) == 0
    assert lector.comision({"ccf": None, "sin_fee": False}, 9) == 9
    assert lector.comision({}, 9) == 9


def test_un_solo_prompt_por_secciones_y_ccf_ya_no_son_partes():
    p = lector.PROMPT
    for seccion in ("1. GENERAL", "2. EL PAGO", "3. SI ES CASH", "4. SI ES CC", "5. SI ES MIXTO", "6. CAMPOS"):
        assert seccion in p
    assert "→ parts_gil=10" not in p and '"tipo_pago"' in p


def _ia_falsa(monkeypatch, cuerpo, visto=None):
    def crea(**kw):
        if visto is not None:
            visto["system"] = kw["messages"][0]["content"]
        return SimpleNamespace(usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5),
                               choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(cuerpo)))])
    monkeypatch.setattr(controllers, "client", SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=crea))))


def test_la_ia_decide_el_pago_y_el_codigo_pone_lo_exacto(monkeypatch):
    visto = {}
    _ia_falsa(monkeypatch, {"job_name": "Z1", "job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "MIXTO"}, visto)
    r, uso = controllers.parse_ticket_con_uso("Z1 lockout 300 split 40% ccf 13")
    assert visto["system"] == lector.PROMPT
    assert r["tipo_pago"] == "MIXTO" and r["ccf"] == 13 and r["porcentaje_tecnico"] == 40   # el pago, de la IA
    assert uso["version_prompt"] == controllers.VERSION_PROMPT


def test_una_app_nunca_queda_en_cash(monkeypatch):
    _ia_falsa(monkeypatch, {"job_name": "Z2", "valor_servicio": 300, "tipo_pago": "CASH"})
    r, _ = controllers.parse_ticket_con_uso("Z2 300 zelle")
    assert r["tipo_pago"] == "CC" and r["sin_fee"] is True


# ── en el trabajo que crea el bot ──
def _crea(clave, ia):
    t = _tanda([{"texto": clave, "wamid": f"w-{clave}"}], {clave: ia}, tecnico_tanda="AFIK")
    return _reg(t["resultados"][0]["registro"]["id"])


def test_sin_senales_queda_como_antes_con_el_contrato():
    reg = _crea("lec-1", {**CC300, "job_name": "LEC-1"})
    assert (reg.porcentaje_tecnico, reg.porcentaje_cc) == (50, 9)                 # 3 % de 300


def test_ccf_es_la_comision_en_dolares():
    reg = _crea("lec-2", {**CC300, "job_name": "LEC-2", "ccf": 13, "sin_fee": False})
    assert reg.porcentaje_cc == 13 and reg.partes_gil == 0


def test_no_fee_y_las_apps_no_cobran_comision():
    assert _crea("lec-3", {**CC300, "job_name": "LEC-3", "sin_fee": True}).porcentaje_cc == 0


def test_el_porcentaje_suelto_es_lo_que_se_lleva_el_tecnico():
    reg = _crea("lec-4", {**CC300, "job_name": "LEC-4", "porcentaje_tecnico": 40})
    assert reg.porcentaje_tecnico == 40 and reg.porcentaje_cc == 9


# ── al corregir desde el chat ──
@pytest.mark.parametrize("texto,esperado", [
    ("ccf 13", {"porcentaje_cc": 13}),
    ("13 ccf", {"porcentaje_cc": 13}),
    ("no fee", {"porcentaje_cc": 0}),
    ("sin fee", {"porcentaje_cc": 0}),
    ("40%", {"porcentaje_tecnico": 40}),
    ("fue zelle", {"tipo_pago": "CC", "porcentaje_cc": 0}),
    ("pago por venmo", {"tipo_pago": "CC", "porcentaje_cc": 0}),
    ("son 300 cash app", {"valor_servicio": 300, "tipo_pago": "CC", "porcentaje_cc": 0}),
    ("son 320 cash", {"valor_servicio": 320, "tipo_pago": "CASH"}),
    ("12 ccf son el porcentaje de la tarjeta y las partes de Gil es 0", {"porcentaje_cc": 12, "partes_gil": 0}),
])
def test_la_correccion_entiende_las_reglas_nuevas(texto, esperado):
    assert correccion.por_codigo(texto) == esperado


def test_corregir_el_porcentaje_del_tecnico_recalcula():
    rid = _nuevo("lec-c1", {**CC300, "job_name": "LEC-C1"})
    antes = _reg(rid).total
    r = _edita(rid, "40%")
    reg = _reg(rid)
    assert r["estado"] == "creado" and reg.porcentaje_tecnico == 40 and reg.total != antes
    assert any(c["campo"] == "% técnico" for c in r["cambios"])


def test_corregir_a_zelle_quita_la_comision():
    rid = _nuevo("lec-c2", {**CC300, "job_name": "LEC-C2"})
    assert _reg(rid).porcentaje_cc == 9
    _edita(rid, "fue zelle")
    assert _reg(rid).porcentaje_cc == 0


def test_ccf_quiere_decir_tarjeta(monkeypatch):
    # G5 del 2026-11-09: «412$ | 30$ parts | 17$ ccf» quedó CASH
    _ia_falsa(monkeypatch, {"job_name": "G5", "valor_servicio": 412, "parts_tecnico": 30, "tipo_pago": "CASH"})
    r, _ = controllers.parse_ticket_con_uso("Job: G5 | 412$ | 30$ parts | 17$ ccf")
    assert r["tipo_pago"] == "CC" and r["ccf"] == 17
    _ia_falsa(monkeypatch, {"job_name": "G6", "valor_servicio": 300, "tipo_pago": "MIXTO"})
    assert controllers.parse_ticket_con_uso("G6 100 cash 200 card 9 ccf")[0]["tipo_pago"] == "MIXTO"   # se respeta


def test_un_numero_de_job_corto_se_busca_exacto():
    from app.db import SessionLocal
    from app import servicio_bot
    _crea("lec-g5", {**CC300, "job_name": "G5"})
    _crea("lec-g55", {**CC300, "job_name": "G55"})
    db = SessionLocal()
    try:
        assert [x["job_name"] for x in servicio_bot.buscar(db, "g5")] == ["G5"]
        assert servicio_bot.buscar(db, "G") == []
    finally:
        db.close()


def test_el_contrato_con_cc_como_cash_lo_trae_encendido():
    from app.db import SessionLocal
    from app.models import Trabajo
    db = SessionLocal()
    if not db.query(Trabajo).filter(Trabajo.nombre == "ZETA").first():
        db.add(Trabajo(nombre="ZETA", job="TODO", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=0, minimo=40,
                       porcentaje_cc=3, cargo_sabados=0, porcentaje_adicional_empresa=0, cc_como_cash=True))
        db.commit()
    db.close()
    t = _tanda([{"texto": "lec-q1", "wamid": "w-lec-q1"}], {"lec-q1": {**CC300, "job_name": "LEC-Q1"}}, tecnico_tanda="ZETA")
    assert "registro" in t["resultados"][0], t["resultados"][0]
    assert _reg(t["resultados"][0]["registro"]["id"]).is_cash is True
    assert _crea("lec-q2", {**CC300, "job_name": "LEC-Q2"}).is_cash is False          # AFIK no lo tiene
