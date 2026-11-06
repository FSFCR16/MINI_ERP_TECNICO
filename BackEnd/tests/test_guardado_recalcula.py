"""Plan del bot, fase 2: al guardar, el servidor recalcula con la misma fórmula y manda; si el panel dijo otra cosa, se
anota. Lo que la fórmula usa queda guardado en la fila (un trabajo viejo no cambia de total si cambia el contrato)."""

from datetime import date

import pytest

from app import servicio_calculo
from app.db import SessionLocal
from app.models import SemanaTecnico, Trabajo, registrosSchemma
from app.models_bot import DiferenciaCalculo

SEMANA = "2026_11_semana_45"


@pytest.fixture(scope="module")
def contrato():
    db = SessionLocal()
    t = db.query(Trabajo).filter(Trabajo.nombre == "PRUEBA CALC").first()
    if not t:
        t = Trabajo(nombre="PRUEBA CALC", job="LOCKOUT", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=2.5,
                    minimo=50, porcentaje_cc=3, cargo_sabados=0, porcentaje_adicional_empresa=0)
        db.add(t)
        if not db.query(SemanaTecnico).filter(SemanaTecnico.semana == SEMANA).first():
            db.add(SemanaTecnico(year_num=2026, numero_semana=45, semana=SEMANA, fecha_inicio=date(2026, 11, 2),
                                 fecha_fin=date(2026, 11, 8)))
        db.commit()
    tid = t.id
    db.close()
    return tid


def _fila(tid, **x):
    base = dict(id="tmp-1", id_tecnico=tid, nombre="PRUEBA CALC", job="LOCKOUT", job_name="DCBAV", valor_servicio=300,
                porcentaje_tecnico=50, minimo=50, opciones_pago=[], tipo_pago="CASH", valor_tarjeta=0, valor_efectivo=0,
                porcentaje_cc=0, partes_gil=0, partes_tecnico=0, tech=0, subtotal=0, total=152.5, adicional_dolar=2.5,
                notas=[])
    return {**base, **x}


def _diferencias():
    db = SessionLocal()
    n = db.query(DiferenciaCalculo).count()
    db.close()
    return n


def test_si_el_panel_calcula_bien_no_se_anota_nada(cliente, sesion, contrato):
    antes = _diferencias()
    r = cliente.post("/api/registrosDataBase", headers=sesion, json={"semana": SEMANA, "registros": [_fila(contrato)]})
    assert r.status_code == 200, r.text
    fila = r.json()["registros"][0]
    assert fila["total"] == 152.5 and _diferencias() == antes


def test_si_el_panel_dice_otro_total_gana_el_servidor_y_se_anota(cliente, sesion, contrato):
    antes = _diferencias()
    r = cliente.post("/api/registrosDataBase", headers=sesion,
                     json={"semana": SEMANA, "registros": [_fila(contrato, job_name="MAL1", total=999)]})
    fila = r.json()["registros"][0]
    assert fila["total"] == 152.5                                   # el del servidor
    assert _diferencias() == antes + 1
    db = SessionLocal()
    d = db.query(DiferenciaCalculo).order_by(DiferenciaCalculo.id.desc()).first()
    assert (d.total_panel, d.total_servidor) == (999, 152.5) and '"valor_servicio": 300.0' in d.entrada
    assert db.get(registrosSchemma, fila["id"]).total == 152.5
    db.close()


def test_editar_en_bloque_recalcula_y_devuelve_lo_guardado(cliente, sesion, contrato):
    r = cliente.post("/api/registrosDataBase", headers=sesion,
                     json={"semana": SEMANA, "registros": [_fila(contrato, job_name="EDIT1")]})
    rid = r.json()["registros"][0]["id"]
    # pasa a CC con comisión 9: Gil le debe al técnico (300 − 9) × 50 % − 2,5 → −143
    r2 = cliente.put("/api/bulk-update-registros", headers=sesion,
                     json=[{"id": rid, "tipo_pago": "CC", "porcentaje_cc": 9, "total": -143.0}])
    assert r2.status_code == 200 and r2.json()["registros"][0]["total"] == -143.0
    r3 = cliente.put(f"/api/update-registro/{rid}", headers=sesion, json={"tipo_pago": "CASH", "porcentaje_cc": 0})
    assert r3.json()["registro"]["total"] == 152.5                  # sin total del panel: el servidor igual lo pone


def test_lo_usado_queda_guardado_y_un_cambio_de_contrato_no_mueve_trabajos_viejos(cliente, sesion, contrato):
    r = cliente.post("/api/registrosDataBase", headers=sesion,
                     json={"semana": SEMANA, "registros": [_fila(contrato, job_name="VIEJO1", is_cash=True,
                                                                tipo_pago="CC", porcentaje_cc=9, total=0)]})
    rid = r.json()["registros"][0]["id"]
    db = SessionLocal()
    reg = db.get(registrosSchemma, rid)
    assert (reg.is_cash, reg.minimo, reg.adicional_dolar, reg.aplica_dolar_empresa, reg.origen) == (True, 50, 2.5, "NO", "panel")
    total = reg.total
    t = db.get(Trabajo, contrato)
    t.minimo, t.adicional_dolar = 500, 99                           # cambia el contrato después
    db.commit()
    db.close()
    r2 = cliente.put(f"/api/update-registro/{rid}", headers=sesion, json={"job_name": "VIEJO1-B"})
    assert r2.json()["registro"]["total"] == total                  # el trabajo viejo no se movió
    db = SessionLocal()
    t = db.get(Trabajo, contrato)
    t.minimo, t.adicional_dolar = 50, 2.5
    db.commit()
    db.close()


def test_un_trabajo_de_antes_sin_lo_usado_toma_el_contrato_como_el_panel(contrato):
    db = SessionLocal()
    reg = registrosSchemma(tecnico_id=contrato, semana_id=1, nombre="PRUEBA CALC", job="LOCKOUT", valor_servicio=300,
                           tipo_pago="CASH", porcentaje_tecnico=50, valor_tarjeta=0, valor_efectivo=0, porcentaje_cc=0,
                           partes_gil=0, partes_tecnico=0, tech=0, total=0)
    e = servicio_calculo.entrada(reg, db.get(Trabajo, contrato))
    assert (e["minimo"], e["adicional_dolar"], e["aplica_dolar_empresa"], e["is_cash"]) == (50, 2.5, "NO", False)
    db.close()
