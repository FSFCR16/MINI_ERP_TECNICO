"""tests/test_lectura_ia.py — saber qué leyó mal la IA sin que nadie marque nada (2026-11-09).
El mensaje pegado en el panel se guarda con lo que leyó la IA, la fila queda atada a él, y la tabla, «Por validar» y
Métricas comparan esa lectura con cómo quedó el trabajo. Nada sale a OpenAI."""

from app import servicio_bot
from app.db import SessionLocal
from app.models_bot import MensajeBot
from tests.test_bot import ACTUAL, CASH300, _reg, _tanda, tecnicos  # noqa: F401 — los técnicos de prueba
from tests.test_correccion import _edita
from tests.test_lector import _ia_falsa


def _fila(mensaje_id, **cambia):
    base = {"id": "x", "id_tecnico": 1, "nombre": "AFIK", "job": "LOCKOUT", "job_name": "PAN-1", "valor_servicio": 300,
            "porcentaje_tecnico": 50, "minimo": 50, "opciones_pago": ["CASH", "CC", "MIXTO"], "tipo_pago": "CASH",
            "valor_tarjeta": 0, "valor_efectivo": 0, "porcentaje_cc": 0, "partes_gil": 0, "partes_tecnico": 0, "tech": 0,
            "subtotal": 0, "total": 0, "adicional_dolar": 2.5, "notas": [], "mensaje_id": mensaje_id}
    return {**base, **cambia}


def _contrato_afik():
    from app.models import Trabajo
    db = SessionLocal()
    c = db.query(Trabajo).filter(Trabajo.nombre == "AFIK", Trabajo.job == "LOCKOUT").first().id
    db.close()
    return c


def test_lo_pegado_en_el_panel_se_guarda_y_la_tabla_marca_lo_que_cambio(cliente, sesion, monkeypatch):
    _ia_falsa(monkeypatch, {"job_name": "PAN-1", "job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CASH"})
    leido = cliente.post("/api/parsear-mensaje", headers=sesion, json={"mensaje": "PAN-1 lockout 300"}).json()
    mid = leido["mensaje_id"]
    db = SessionLocal()
    m = db.get(MensajeBot, mid)
    assert m.remitente == "panel" and m.estado == "panel" and m.tokens_entrada == 10
    db.close()

    servicio_bot.asegura_semana(SessionLocal(), ACTUAL)
    fila = _fila(mid, id_tecnico=_contrato_afik(), tipo_pago="CC")          # la persona lo cambió a CC antes de guardar
    r = cliente.post("/api/registrosDataBase", headers=sesion, json={"semana": ACTUAL, "registros": [fila]})
    assert r.status_code == 200, r.text
    filas = cliente.get(f"/api/obtenerRegistros/AFIK/{ACTUAL}", headers=sesion).json()
    mia = next(f for f in filas if f["job_name"] == "PAN-1")
    assert mia["mensaje_id"] == mid and mia["lectura"]["fallos"] == [
        {"clave": "tipo_pago", "campo": "pago", "leyo": "CASH", "quedo": "CC"}]
    assert "PAN-1 lockout 300" in mia["lectura"]["texto"]
    db = SessionLocal()
    assert db.get(MensajeBot, mid).registro_id == mia["id"]
    db.close()


def test_un_mensaje_no_se_ata_dos_veces_ni_uno_del_bot(cliente, sesion):
    db = SessionLocal()
    bot = MensajeBot(remitente="+1555", texto="x", estado="creado", salida_ia="{}")
    db.add(bot)
    db.commit()
    bid = bot.id
    db.close()
    fila = _fila(bid, id_tecnico=_contrato_afik(), job_name="PAN-2")
    cliente.post("/api/registrosDataBase", headers=sesion, json={"semana": ACTUAL, "registros": [fila]})
    mia = next(f for f in cliente.get(f"/api/obtenerRegistros/AFIK/{ACTUAL}", headers=sesion).json() if f["job_name"] == "PAN-2")
    assert mia["mensaje_id"] is None and mia["lectura"] is None


def test_leido_bien_no_lleva_puntico():
    r = _tanda([{"texto": "li-1", "wamid": "w-li-1"}], {"li-1": {**CASH300, "job_name": "LI-1"}}, tecnico_tanda="AFIK")
    rid = r["resultados"][0]["registro"]["id"]
    db = SessionLocal()
    p = servicio_bot.pendientes(db, ACTUAL)
    db.close()
    assert next(x for x in p["por_validar"] if x["id"] == rid)["lectura"] is None


def test_por_validar_marca_lo_corregido_por_el_chat():
    r = _tanda([{"texto": "li-2", "wamid": "w-li-2"}], {"li-2": {**CASH300, "job_name": "LI-2"}}, tecnico_tanda="AFIK")
    rid = r["resultados"][0]["registro"]["id"]
    _edita(rid, "son 320 cash")
    db = SessionLocal()
    x = next(x for x in servicio_bot.pendientes(db, ACTUAL)["por_validar"] if x["id"] == rid)
    db.close()
    assert [f["campo"] for f in x["lectura"]["fallos"]] == ["valor"]


def test_metricas_cuentan_solo_lo_definitivo(cliente, sesion):
    r = _tanda([{"texto": "li-3", "wamid": "w-li-3"}, {"texto": "li-4", "wamid": "w-li-4"}],
               {"li-3": {**CASH300, "job_name": "LI-3"}, "li-4": {**CASH300, "job_name": "LI-4"}}, tecnico_tanda="AFIK")
    ids = [x["registro"]["id"] for x in r["resultados"]]
    db = SessionLocal()
    antes = servicio_bot.metricas(db)["ia"]["semana"]
    db.close()
    _edita(ids[1], "partes gil 20")
    cliente.post("/api/bot/validar", headers=sesion, json={"ids": ids})
    db = SessionLocal()
    ia = servicio_bot.metricas(db)["ia"]["semana"]
    db.close()
    assert ia["leidos"] == antes["leidos"] + 2 and ia["bien"] == antes["bien"] + 1
    assert any(f["campo"] == "partes Gil" for f in ia["falla_mas"])
    assert _reg(ids[0]).validacion is None
