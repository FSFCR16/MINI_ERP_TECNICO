"""tests/test_vocabulario.py — D-381: el vocabulario de la IA (lo aprobado va a las instrucciones; lo propuesto sale
de los trabajos validados y corregidos, y solo entra con «Aceptar»). Nada sale a OpenAI."""

import pytest

from app import controllers, lector, vocabulario
from app.db import SessionLocal
from app.models import registrosSchemma
from app.models_bot import BusquedaVocabulario, PalabraIA
from tests.test_bot import _tanda, tecnicos  # noqa: F401
from tests.test_lector import _ia_falsa


@pytest.fixture()
def db():
    s = SessionLocal()
    s.query(PalabraIA).delete()
    s.query(BusquedaVocabulario).delete()
    s.commit()
    yield s
    s.query(PalabraIA).delete()          # que ninguna palabra quede para las otras pruebas
    s.query(BusquedaVocabulario).delete()
    s.commit()
    s.close()
    vocabulario.invalidar()


def test_lo_aprobado_va_al_final_de_las_instrucciones(db, monkeypatch):
    visto = {}
    _ia_falsa(monkeypatch, {"job_name": "V1", "valor_servicio": 260, "tipo_pago": "CASH"}, visto)
    _, uso = controllers.parse_ticket_con_uso("V1 260$ 10$ keys")
    assert visto["system"] == lector.PROMPT and "+v" not in uso["version_prompt"]          # sin vocabulario: igual
    vocabulario.agregar(db, "Keys", "partes_tecnico", "«10$ keys» = 10 de partes del técnico", "Dueño")
    _, uso = controllers.parse_ticket_con_uso("V1 260$ 10$ keys")
    assert visto["system"].startswith(lector.PROMPT)                                       # lo de antes no cambia
    assert "«keys»: el número que la acompaña va en parts_tecnico" in visto["system"]
    assert uso["version_prompt"].endswith("+v1")


def test_quitar_la_saca_de_las_instrucciones(db):
    vocabulario.agregar(db, "t", "tech", None, None)
    pid = vocabulario.lista(db)["activas"][0]["id"]
    assert vocabulario.texto_prompt()[1] == 1
    vocabulario.decide(db, pid, "quitar", "Dueño")
    assert vocabulario.texto_prompt() == ("", 0)


def _corregido(texto, job, ia, cambia):
    r = _tanda([{"texto": texto, "wamid": f"w-voc-{job}"}], {texto.splitlines()[-1]: {**ia, "job_name": job}},
               tecnico_tanda="AFIK")
    s = SessionLocal()
    reg = s.get(registrosSchemma, r["resultados"][0]["registro"]["id"])
    for k, v in cambia.items():
        setattr(reg, k, v)
    reg.validacion = None                 # validado: ya es definitivo
    s.commit()
    s.close()


def test_propone_solo_lo_que_aparece_en_el_mensaje_y_espera_aceptar(db):
    _corregido("Job: VOCK1\n260$ 10$ keys", "VOCK1",
               {"job_type": "LOCKOUT", "valor_servicio": 260, "tipo_pago": "CASH", "parts_tecnico": 0},
               {"partes_tecnico": 10})
    visto = {}

    def ia(instrucciones, casos):
        visto["casos"] = casos
        return {"propuestas": [
            {"palabra": "keys", "significa": "partes_tecnico", "explicacion": "«10$ keys» = 10 de partes", "jobs": ["VOCK1"]},
            {"palabra": "inventada", "significa": "tech", "jobs": ["VOCK1"]},            # no está en el mensaje
            {"palabra": "keys2", "significa": "nada", "jobs": ["VOCK1"]},                # significado que no existe
        ]}, {"tokens_entrada": 500, "tokens_salida": 100}

    r = vocabulario.proponer(db, pide=ia)
    assert r["propuestas"] == 1 and "VOCK1" in visto["casos"] and "partes técnico: leyó 0 → quedó 10" in visto["casos"]
    lista = vocabulario.lista(db)
    assert [p["palabra"] for p in lista["propuestas"]] == ["keys"] and lista["activas"] == []
    assert vocabulario.texto_prompt() == ("", 0)                                           # propuesta: aún no entra
    assert vocabulario.proponer(db, pide=ia)["revisados"] == 0                             # lo ya visto no se repite
    vocabulario.decide(db, lista["propuestas"][0]["id"], "aceptar", "Dueño")
    assert "«keys»" in vocabulario.texto_prompt()[0]


def test_lo_rechazado_no_se_vuelve_a_proponer(db):
    _corregido("Job: VOCT1\n175$ 100$ t", "VOCT1",
               {"job_type": "LOCKOUT", "valor_servicio": 175, "tipo_pago": "CASH", "tech": 0}, {"tech": 100})
    vistas = []

    def ia(instrucciones, casos):
        vistas.append(instrucciones)
        return {"propuestas": [{"palabra": "t", "significa": "tech", "jobs": ["VOCT1"]}]}, {}

    vocabulario.proponer(db, pide=ia)
    pid = vocabulario.lista(db)["propuestas"][0]["id"]
    vocabulario.decide(db, pid, "rechazar", "Dueño")
    _corregido("Job: VOCT2\n80 45 t", "VOCT2",
               {"job_type": "LOCKOUT", "valor_servicio": 80, "tipo_pago": "CASH", "tech": 0}, {"tech": 45})
    assert vocabulario.proponer(db, pide=ia)["propuestas"] == 0
    assert "«t»" in vistas[-1]                       # se le dice a la IA que ya está decidida
    assert vocabulario.lista(db)["propuestas"] == []


def test_sin_corregidos_no_llama_a_la_ia(db):
    from sqlalchemy import func
    db.add(BusquedaVocabulario(hasta_registro=db.query(func.max(registrosSchemma.id)).scalar() or 0))
    db.commit()                                        # todo lo de antes ya revisado
    llamadas = []
    vocabulario.proponer(db, pide=lambda *a: llamadas.append(a) or ({}, {}))
    assert llamadas == []


def test_una_vez_por_semana(db):
    assert vocabulario.toca(db)
    vocabulario.proponer(db, pide=lambda *a: ({}, {}))
    assert not vocabulario.toca(db)


def test_las_rutas(cliente, sesion, db):
    r = cliente.post("/api/bot/vocabulario", headers=sesion,
                     json={"accion": "agregar", "palabra": "after fee", "significa": "tarjeta", "por": "Dueño"})
    assert r.status_code == 200 and r.json()["activas"][0]["palabra"] == "after fee"
    assert r.json()["activas"][0]["significa_texto"] == "pagado con tarjeta"
    assert cliente.post("/api/bot/vocabulario", headers=sesion,
                        json={"accion": "agregar", "palabra": "x", "significa": "otra"}).status_code == 400
    v = cliente.get("/api/bot/lectura-ia", headers=sesion).json()["vocabulario"]
    assert [p["palabra"] for p in v["activas"]] == ["after fee"] and "partes_tecnico" in v["significados"]
