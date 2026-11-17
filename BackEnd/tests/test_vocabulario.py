"""tests/test_vocabulario.py — D-381/D-382: el vocabulario de la IA. Las palabras viven SOLO aquí (antes también en el
prompt); van a la sección 3 agrupadas por significado; una palabra existe una vez; lo propuesto sale de los trabajos
validados y corregidos y solo entra con «Aceptar». Nada sale a OpenAI."""

import threading

import pytest

from app import controllers, lector, vocabulario
from app.db import SessionLocal
from app.models import registrosSchemma
from app.models_bot import BusquedaVocabulario, MensajeBot, PalabraIA
from tests.test_bot import _tanda, tecnicos  # noqa: F401
from tests.test_lector import _ia_falsa


@pytest.fixture()
def db():
    s = SessionLocal()
    s.query(PalabraIA).delete()
    s.query(BusquedaVocabulario).delete()
    s.commit()
    vocabulario.invalidar()
    yield s
    s.rollback()
    s.query(PalabraIA).delete()          # que ninguna palabra quede para las otras pruebas
    s.query(BusquedaVocabulario).delete()
    s.commit()
    s.close()
    vocabulario.invalidar()


def _sembrada(db):
    assert vocabulario.siembra_base(db) == len(vocabulario.BASE)
    vocabulario.invalidar()


# ── el prompt ──
def test_sin_sembrar_manda_el_vocabulario_del_codigo(db):
    t, n = vocabulario.texto_prompt()
    assert n == len(vocabulario.BASE) and "- pagado con tarjeta → CC: cc, card," in t


def test_el_prompt_son_reglas_vocabulario_y_campos_sin_palabras_repetidas(db, monkeypatch):
    _sembrada(db)
    visto = {}
    _ia_falsa(monkeypatch, {"job_name": "V1", "valor_servicio": 260, "tipo_pago": "CASH"}, visto)
    _, uso = controllers.parse_ticket_con_uso("V1 260$ 10$ keys")
    p = visto["system"]
    assert p.startswith(lector.REGLAS) and p.endswith(lector.CAMPOS)
    assert "- partes del técnico → parts_tecnico: parts, part, keys («10$ keys» = 10 de partes del técnico)" in p
    assert uso["version_prompt"] == f"{controllers.VERSION_PROMPT}+v{len(vocabulario.BASE)}"
    seccion = p.split("3. VOCABULARIO")[1].split("4. CAMPOS")[0]
    palabras = [w.split(" (")[0].strip() for linea in seccion.splitlines() if ": " in linea
                for w in linea.split(": ", 1)[1].split(", ") if not w.startswith("«")]
    assert len(palabras) == len(set(palabras))                                    # ninguna dos veces
    assert "scanpay" not in lector.REGLAS and "company parts" not in lector.REGLAS  # las palabras ya no están en las reglas


def test_sembrar_es_una_sola_vez_y_respeta_lo_quitado(db):
    db.add(PalabraIA(palabra="scanpay", significa="tarjeta", estado="quitada", origen="propuesta"))
    db.commit()
    _sembrada(db)
    assert db.query(PalabraIA).filter(PalabraIA.palabra == "scanpay").one().estado == "activa"   # vuelve, como base
    pid = db.query(PalabraIA).filter(PalabraIA.palabra == "lock").one().id
    vocabulario.decide(db, pid, "quitar", "Dueño")
    assert vocabulario.siembra_base(db) == 0                                       # no la revive
    t = vocabulario.texto_prompt()[0]
    assert "lock change" in t and not t.rstrip().endswith(", lock")


# ── sin duplicados ──
def test_agregar_una_que_existe_no_la_duplica(db):
    _sembrada(db)
    vocabulario.agregar(db, " Keys ", "partes_gil", "otro ejemplo", "Dueño")
    filas = db.query(PalabraIA).filter(PalabraIA.palabra == "keys").all()
    assert len(filas) == 1 and filas[0].significa == "partes_gil"


def test_la_base_no_admite_dos_iguales(db):
    from sqlalchemy.exc import IntegrityError
    db.add(PalabraIA(palabra="x1", significa="tech"))
    db.commit()
    db.add(PalabraIA(palabra="x1", significa="tech"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_editar_cambia_lo_que_lee_la_ia(db):
    _sembrada(db)
    pid = db.query(PalabraIA).filter(PalabraIA.palabra == "keys").one().id
    vocabulario.editar(db, pid, "partes_tecnico", "«5 keys» = 5 de partes", "Dueño")
    assert "keys («5 keys» = 5 de partes)" in vocabulario.texto_prompt()[0]
    with pytest.raises(vocabulario.VocabularioInvalido):
        vocabulario.editar(db, pid, "otra", None, None)


# ── proponer ──
def _corregido(texto, job, ia, cambia):
    r = _tanda([{"texto": texto, "wamid": f"w-voc-{job}"}], {texto.splitlines()[-1]: {**ia, "job_name": job}},
               tecnico_tanda="AFIK")
    s = SessionLocal()
    reg = s.get(registrosSchemma, r["resultados"][0]["registro"]["id"])
    for k, v in cambia.items():
        setattr(reg, k, v)
    reg.validacion = None                 # validado: ya es definitivo
    s.commit()
    rid = reg.id
    s.close()
    return rid


def _todo_revisado(db):
    from sqlalchemy import func
    db.add(BusquedaVocabulario(hasta_registro=db.query(func.max(registrosSchemma.id)).scalar() or 0))
    db.commit()


def test_propone_lo_nuevo_nunca_lo_que_ya_existe_y_aceptar_lo_revisa(db):
    _sembrada(db)
    _todo_revisado(db)
    rid = _corregido("Job: VOCT1\n175$ 100$ tt", "VOCT1",
                     {"job_type": "LOCKOUT", "valor_servicio": 175, "tipo_pago": "CASH", "tech": 0}, {"tech": 100})
    visto = {}

    def ia(instrucciones, casos):
        visto["instrucciones"], visto["casos"] = instrucciones, casos
        return {"propuestas": [
            {"palabra": "tt", "significa": "tech", "explicacion": "«100$ tt» = 100 al técnico", "jobs": ["VOCT1"]},
            {"palabra": "cash", "significa": "cash", "jobs": ["VOCT1"]},           # ya la sabe (base)
            {"palabra": "inventada", "significa": "tech", "jobs": ["VOCT1"]},      # no está en el mensaje
        ]}, {"tokens_entrada": 500, "tokens_salida": 100}

    assert vocabulario.proponer(db, pide=ia)["propuestas"] == 1
    assert "«scanpay»" in visto["instrucciones"] and "to tech: leyó 0 → quedó 100" in visto["casos"]
    (prop,) = vocabulario.lista(db)["propuestas"]
    assert prop["palabra"] == "tt" and "tt (" not in vocabulario.texto_prompt()[0]   # propuesta: aún no entra
    vocabulario.decide(db, prop["id"], "aceptar", "Dueño")
    assert "para el tecnico, tt («100$ tt» = 100 al técnico)" in vocabulario.texto_prompt()[0]
    m = db.get(MensajeBot, db.get(registrosSchemma, rid).mensaje_id)
    db.refresh(m)
    assert m.revisado_at is not None                                              # el caso que explica pasó a revisados


def test_lo_rechazado_no_se_vuelve_a_proponer(db):
    _todo_revisado(db)
    _corregido("Job: VOCK1\n260$ 10$ zz", "VOCK1",
               {"job_type": "LOCKOUT", "valor_servicio": 260, "tipo_pago": "CASH", "parts_tecnico": 0}, {"partes_tecnico": 10})
    ia = lambda *a: ({"propuestas": [{"palabra": "zz", "significa": "partes_tecnico", "jobs": ["VOCK1"]}]}, {})  # noqa: E731
    vocabulario.proponer(db, pide=ia)
    vocabulario.decide(db, vocabulario.lista(db)["propuestas"][0]["id"], "rechazar", "Dueño")
    _corregido("Job: VOCK2\n80 5 zz", "VOCK2",
               {"job_type": "LOCKOUT", "valor_servicio": 80, "tipo_pago": "CASH", "parts_tecnico": 0}, {"partes_tecnico": 5})
    assert vocabulario.proponer(db, pide=ia)["propuestas"] == 0
    assert db.query(PalabraIA).filter(PalabraIA.palabra == "zz").count() == 1


def test_una_busqueda_a_la_vez(db):
    # 2026-11-17: dos búsquedas a la vez duplicaron todas las palabras
    dentro, sigue = threading.Event(), threading.Event()

    def lenta(*a):
        dentro.set()
        sigue.wait(5)
        return {}, {}

    vocabulario._busqueda.acquire()          # como si otra búsqueda estuviera corriendo
    try:
        assert vocabulario.proponer(db, pide=lenta) == {"revisados": 0, "propuestas": 0, "ocupado": True}
    finally:
        vocabulario._busqueda.release()


def test_sin_corregidos_no_llama_a_la_ia(db):
    _todo_revisado(db)
    llamadas = []
    vocabulario.proponer(db, pide=lambda *a: llamadas.append(a) or ({}, {}))
    assert llamadas == []


def test_una_vez_por_semana(db):
    assert vocabulario.toca(db)
    vocabulario.proponer(db, pide=lambda *a: ({}, {}))
    assert not vocabulario.toca(db)


# ── las rutas ──
def test_las_rutas(cliente, sesion, db):
    r = cliente.post("/api/bot/vocabulario", headers=sesion,
                     json={"accion": "agregar", "palabra": "after fee", "significa": "tarjeta", "por": "Dueño"})
    assert r.status_code == 200 and r.json()["activas"][0]["palabra"] == "after fee"
    pid = r.json()["activas"][0]["id"]
    r = cliente.post("/api/bot/vocabulario", headers=sesion,
                     json={"accion": "editar", "id": pid, "significa": "valor", "explicacion": "«229$ after fee»"})
    assert r.json()["activas"][0]["significa_texto"] == "valor del servicio"
    assert cliente.post("/api/bot/vocabulario", headers=sesion,
                        json={"accion": "agregar", "palabra": "x", "significa": "otra"}).status_code == 400
    v = cliente.get("/api/bot/lectura-ia", headers=sesion).json()
    assert "car_key" in v["vocabulario"]["significados"] and all("revisado" in x for x in v["mal_leidos"])


def test_marcar_revisado(cliente, sesion, db):
    rid = _corregido("Job: VOCR1\n50$ 5$ ww", "VOCR1",
                     {"job_type": "LOCKOUT", "valor_servicio": 50, "tipo_pago": "CASH", "parts_tecnico": 0}, {"partes_tecnico": 5})

    def caso():
        return [x for x in cliente.get("/api/bot/lectura-ia?n=26", headers=sesion).json()["mal_leidos"] if x["id"] == rid][0]

    assert cliente.post("/api/bot/lectura-ia/revisado", headers=sesion, json={"ids": [rid]}).json() == {"marcados": 1}
    assert caso()["revisado"] is True
    cliente.post("/api/bot/lectura-ia/revisado", headers=sesion, json={"ids": [rid], "revisado": False})
    assert caso()["revisado"] is False
    assert cliente.post("/api/bot/lectura-ia/revisado", headers=sesion, json={"ids": []}).status_code == 400
