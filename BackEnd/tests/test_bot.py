"""Plan del bot, fases 3 y 5: el ERP del lado del bot. La IA se reemplaza por un lector falso (nada sale a OpenAI)."""

import json
from datetime import date, timedelta

import pytest

from app import servicio_bot
from app.db import SessionLocal
from app.models import SemanaTecnico, Trabajo, registrosSchemma
from app.models_bot import MensajeBot
from app.models_notas import NotaTecnico
from app.servicio_alertas import fechas_posibles

HOY = date.today()
LUNES = HOY - timedelta(days=HOY.weekday())
ACTUAL = servicio_bot.etiqueta_semana(LUNES)
PASADA = servicio_bot.etiqueta_semana(LUNES - timedelta(weeks=1))
USO = {"modelo": "gpt-4o-mini", "version_prompt": "prueba", "tokens_entrada": 1000, "tokens_salida": 200}


def lee(tabla):
    """Lector falso: el texto del mensaje es la llave de lo que «leyó la IA»."""
    def lector(texto):
        clave = texto.splitlines()[-1].strip()
        if clave not in tabla:
            return {}, dict(USO)
        # Sin número de job no entra: las pruebas que no hablan de eso traen uno propio de su mensaje.
        return {"job_name": f"T-{abs(hash(clave)) % 10_000_000}", **tabla[clave]}, dict(USO)
    return lector


@pytest.fixture(scope="module", autouse=True)
def tecnicos():
    db = SessionLocal()
    if not db.query(Trabajo).filter(Trabajo.nombre == "AFIK").first():
        db.add_all([
            Trabajo(nombre="AFIK", job="LOCKOUT", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=2.5,
                    minimo=50, porcentaje_cc=3, cargo_sabados=10, porcentaje_adicional_empresa=0),
            Trabajo(nombre="AFIK", job="CAR KEY", porcentaje_tecnico=40, porcentaje_gil=60, adicional_dolar=0,
                    minimo=60, porcentaje_cc=3, cargo_sabados=0, porcentaje_adicional_empresa=0),
            Trabajo(nombre="NICK", job="TODO", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=0,
                    minimo=40, porcentaje_cc=4, cargo_sabados=0, porcentaje_adicional_empresa=0),
            Trabajo(nombre="CERO", job="LOCKOUT", porcentaje_tecnico=0, porcentaje_gil=100, adicional_dolar=0,
                    minimo=50, porcentaje_cc=0, cargo_sabados=0, porcentaje_adicional_empresa=0),
        ])
        db.commit()
    db.close()


def _tanda(mensajes, tabla, semana=ACTUAL, **kw):
    db = SessionLocal()
    try:
        return servicio_bot.crea_trabajos(db, semana, mensajes, lector=lee(tabla), **kw)
    finally:
        db.close()


def _reg(rid):
    db = SessionLocal()
    r = db.get(registrosSchemma, rid)
    db.close()
    return r


CASH300 = {"job_name": "B1-CASH", "job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CASH"}


# ─────────────────────────── la tanda ───────────────────────────
def test_tanda_con_marca_de_tecnico_y_nombre_en_el_mensaje():
    tabla = {"j1": CASH300, "j2": {**CASH300, "job_name": "B1-CC", "tipo_pago": "CC"},
             "j3": {"job_name": "B1-NICK", "valor_servicio": 200, "tipo_pago": "CASH"}}
    r = _tanda([{"texto": "AFIK", "wamid": "w-b1-0"}, {"texto": "j1", "wamid": "w-b1-1"},
                {"texto": "j2", "wamid": "w-b1-2"}, {"texto": "Nick ***\nj3", "wamid": "w-b1-3"}], tabla)
    est = [x["estado"] for x in r["resultados"]]
    assert est == ["marca_tecnico", "creado", "creado", "creado"]
    assert [x["tecnico"] for x in r["resultados"]] == ["AFIK", "AFIK", "AFIK", "NICK"]   # C gana solo en su mensaje
    assert r["tecnico_tanda"] == "AFIK"
    cash = _reg(r["resultados"][1]["registro"]["id"])
    assert (cash.total, cash.origen, cash.validacion, cash.job) == (152.5, "bot", "por_validar", "LOCKOUT")
    cc = _reg(r["resultados"][2]["registro"]["id"])
    assert (cc.porcentaje_cc, cc.total) == (9.0, -143.0)                # comisión 3 % de 300 y el total del servidor
    nick = _reg(r["resultados"][3]["registro"]["id"])
    assert nick.job == "TODO" and nick.total == 100.0                   # contrato «TODO» vale para todo


def test_el_tecnico_de_la_tanda_sigue_en_la_siguiente_llamada_y_el_gasto_queda():
    r = _tanda([{"texto": "j9", "wamid": "w-b2-1"}], {"j9": {**CASH300, "job_name": "B2-1"}}, tecnico_tanda="AFIK")
    assert r["resultados"][0]["estado"] == "creado"
    db = SessionLocal()
    m = db.get(MensajeBot, r["resultados"][0]["mensaje_id"])
    assert (m.tokens_entrada, m.tokens_salida, m.costo_usd, m.tanda) == (1000, 200, 0.0002, r["tanda"])
    assert json.loads(m.salida_ia)["job_name"] == "B2-1"
    db.close()


def test_un_reintento_de_whatsapp_no_duplica():
    tabla = {"j9": {**CASH300, "job_name": "B3-1"}}
    a = _tanda([{"texto": "j9", "wamid": "w-b3"}], tabla, tecnico_tanda="AFIK")
    b = _tanda([{"texto": "j9", "wamid": "w-b3"}], tabla, tecnico_tanda="AFIK")
    assert b["resultados"][0]["registro"]["id"] == a["resultados"][0]["registro"]["id"]
    assert b["resultados"][0]["repetido_whatsapp"] is True
    db = SessionLocal()
    assert db.query(registrosSchemma).filter(registrosSchemma.job_name == "B3-1").count() == 1
    db.close()


# ─────────────────────────── los 🔴 ───────────────────────────
@pytest.mark.parametrize("ia,tecnico,estado", [
    ({**CASH300, "job_name": "R-SINV", "valor_servicio": 0}, "AFIK", "sin_valor"),
    ({**CASH300, "job_name": "R-MIX", "tipo_pago": "MIXTO", "valor_efectivo": 100}, "AFIK", "mixto_sin_reparto"),
    ({**CASH300, "job_name": "R-JOB", "job_type": "SAFE"}, "AFIK", "sin_contrato"),
    ({**CASH300, "job_name": "R-SINJT", "job_type": None}, "AFIK", "sin_contrato"),   # dos contratos y no dice cuál
    ({**CASH300, "job_name": "R-CERO"}, "CERO", "sin_calculo"),                       # % técnico 0: la fórmula no calcula
    ({**CASH300, "job_name": "R-PARTES", "parts_tecnico": 200, "parts_gil": 200}, "AFIK", "sin_calculo"),
    ({**CASH300, "job_name": "B1-CASH"}, "AFIK", "repetido"),
    ({**CASH300, "job_name": "R-SINT"}, None, "sin_tecnico"),
    ({}, "AFIK", "sin_lectura"),
])
def test_lo_que_no_se_puede_calcular_no_entra(ia, tecnico, estado):
    r = _tanda([{"texto": "j9"}], {"j9": ia} if ia else {}, tecnico_tanda=tecnico)["resultados"][0]
    assert r["estado"] == estado and "registro" not in r
    assert r["motivo"] and r["falta"]


def test_completar_un_rojo_lo_deja_entrar():
    r = _tanda([{"texto": "j9"}], {"j9": {**CASH300, "job_name": "R-COMP", "valor_servicio": None}},
               tecnico_tanda="AFIK")["resultados"][0]
    assert r["estado"] == "sin_valor"
    db = SessionLocal()
    c = servicio_bot.completa(db, r["mensaje_id"], {"valor_servicio": 300})
    db.close()
    assert c["estado"] == "creado" and c["registro"]["total"] == 152.5


def test_completar_el_tecnico_que_faltaba():
    r = _tanda([{"texto": "j9"}], {"j9": {**CASH300, "job_name": "R-COMPT"}})["resultados"][0]
    assert r["estado"] == "sin_tecnico"
    db = SessionLocal()
    c = servicio_bot.completa(db, r["mensaje_id"], {"tecnico": "nick"})
    db.close()
    assert c["estado"] == "creado" and c["tecnico"] == "NICK"


# ─────────────────────────── las 🟡 ───────────────────────────
def _alertas(ia, tecnico="AFIK", semana=ACTUAL):
    r = _tanda([{"texto": "j9"}], {"j9": ia}, tecnico_tanda=tecnico, semana=semana)["resultados"][0]
    assert r["estado"] == "creado", r
    a = _reg(r["registro"]["id"]).alertas
    return {x["codigo"] for x in json.loads(a)} if a else set()


def test_alertas_amarillas_entran_marcadas():
    assert _alertas({**CASH300, "job_name": "A-OK"}) == set()
    assert "bajo_minimo" in _alertas({**CASH300, "job_name": "A-MIN", "valor_servicio": 40})
    assert "partes_mayores" in _alertas({**CASH300, "job_name": "A-PART", "valor_servicio": 100, "tech": 150})
    lejos = (LUNES - timedelta(weeks=5)).strftime("%m/%d/%Y")
    assert "fecha_fuera" in _alertas({**CASH300, "job_name": "A-FECHA", "date": lejos})


def test_sabado_solo_avisa_y_no_cambia_el_porcentaje():
    sabado = LUNES - timedelta(weeks=1) + timedelta(days=5)
    # 13 de un mes no se confunde: sirve una fecha con día > 12 para que M/D y D/M no den dos fechas
    texto = sabado.strftime("%Y-%m-%d")
    r = _tanda([{"texto": "j9"}], {"j9": {**CASH300, "job_name": "A-SAB", "date": texto}}, tecnico_tanda="AFIK",
               semana=PASADA)["resultados"][0]
    reg = _reg(r["registro"]["id"])
    assert "sabado" in {x["codigo"] for x in json.loads(reg.alertas)}
    assert reg.porcentaje_tecnico == 50 and reg.total == 152.5


def test_fechas_ambiguas_se_leen_de_las_dos_formas():
    assert fechas_posibles("11/03/2026", 2026) == [date(2026, 11, 3), date(2026, 3, 11)]
    assert fechas_posibles("Nov 3, 2026", 2026) == [date(2026, 11, 3)]
    assert fechas_posibles("3 de noviembre", 2026) == [date(2026, 11, 3)]
    assert fechas_posibles("2026-11-03", 2026) == [date(2026, 11, 3)]
    assert fechas_posibles(None, 2026) == [] and fechas_posibles("ayer", 2026) == []


# ─────────────────────────── comandos y panel ───────────────────────────
def test_resumen_pendientes_validar_y_cerrar_semana():
    sem = servicio_bot.etiqueta_semana(LUNES - timedelta(weeks=3))
    tabla = {"a9": {**CASH300, "job_name": "C-1"}, "b9": {**CASH300, "job_name": "C-2", "valor_servicio": 0}}
    r = _tanda([{"texto": "a9"}, {"texto": "b9"}], tabla, tecnico_tanda="AFIK", semana=sem)["resultados"]
    db = SessionLocal()
    res = servicio_bot.resumen(db, sem)
    assert res["tecnicos"][0] | {} == {**res["tecnicos"][0], "tecnico": "AFIK", "trabajos": 1, "ventas": 300.0,
                                       "saldo": 152.5, "por_validar": 1}
    assert res["bloqueados"] == 1
    no = servicio_bot.cierra_semana(db, sem)
    assert not no["cerrada"] and no["bloqueados"] == 1 and no["por_validar"] == 1
    servicio_bot.completa(db, r[1]["mensaje_id"], {"valor_servicio": 200})
    p = servicio_bot.pendientes(db, sem)
    assert len(p["por_validar"]) == 2 and not p["bloqueados"]
    assert servicio_bot.valida(db, [x["id"] for x in p["por_validar"]]) == 2
    assert servicio_bot.cierra_semana(db, sem)["cerrada"] is True
    assert db.query(SemanaTecnico).filter(SemanaTecnico.semana == sem).first().estado == "cerrada"
    db.close()
    assert "semana_cerrada" in _alertas({**CASH300, "job_name": "C-3"}, semana=sem)


def test_validar_anota_que_campos_corrigio_una_persona(cliente, sesion):
    r = _tanda([{"texto": "j9"}], {"j9": {**CASH300, "job_name": "V-1"}}, tecnico_tanda="AFIK")["resultados"][0]
    rid = r["registro"]["id"]
    cliente.put(f"/api/update-registro/{rid}", headers=sesion, json={"valor_servicio": 320, "total": 0})
    assert cliente.post("/api/bot/validar", headers=sesion, json={"ids": [rid]}).json() == {"validados": 1}
    db = SessionLocal()
    m = db.get(MensajeBot, r["mensaje_id"])
    assert json.loads(m.campos_corregidos) == ["valor_servicio"]
    assert json.loads(m.datos_finales)["total"] == 162.5
    assert db.get(registrosSchemma, rid).validacion is None
    db.close()


def test_buscar_borrar_y_deshacer():
    t = _tanda([{"texto": "a9"}, {"texto": "b9"}], {"a9": {**CASH300, "job_name": "D-UNO"},
                                                  "b9": {**CASH300, "job_name": "D-DOS"}}, tecnico_tanda="AFIK")
    db = SessionLocal()
    assert [x["job_name"] for x in servicio_bot.buscar(db, "d-uno")] == ["D-UNO"]
    assert servicio_bot.buscar(db, "D") == []                              # muy corto: no lista media base
    uno = t["resultados"][0]["registro"]["id"]
    servicio_bot.valida(db, [uno])                                         # lo aprobado no se deshace
    assert servicio_bot.deshace_tanda(db, t["tanda"]) == {"borrados": 1, "ya_validados": 1}
    assert servicio_bot.borra(db, [uno]) == 1
    assert servicio_bot.buscar(db, "D-UNO") == [] and servicio_bot.buscar(db, "D-DOS") == []
    db.close()


def test_nota_siembra_primero_las_de_siempre():
    db = SessionLocal()
    n = servicio_bot.agrega_nota(db, ACTUAL, "afik", "Le debe 20 a Gil")
    sem = db.query(SemanaTecnico).filter(SemanaTecnico.semana == ACTUAL).first()
    textos = [x.texto for x in db.query(NotaTecnico).filter(NotaTecnico.nombre == "AFIK", NotaTecnico.semana_id == sem.id)
              .order_by(NotaTecnico.orden).all()]
    db.close()
    assert n["tecnico"] == "AFIK"
    assert textos == ["El minimo de este tecnico es de 50 dolares",
                      "Este técnico tiene un porcentaje diferente si el servicio lo realizo el dia sabado, el porcentaje es de 10%",
                      "Le debe 20 a Gil"]


def test_nuevos_para_el_panel_abierto_y_gasto_de_ia():
    db = SessionLocal()
    antes = servicio_bot.nuevos(db, "NICK", ACTUAL, 0)
    gasto0 = servicio_bot.gasto_ia(db)
    db.close()
    _tanda([{"texto": "a9"}, {"texto": "b9"}], {"a9": {**CASH300, "job_name": "N-1"}, "b9": {**CASH300, "job_name": "N-2"}},
           tecnico_tanda="NICK")
    db = SessionLocal()
    despues = servicio_bot.nuevos(db, "NICK", ACTUAL, antes["ultimo_id"])
    gasto = servicio_bot.gasto_ia(db, desde=HOY - timedelta(days=1))
    db.close()
    assert despues["nuevos"] == 2 and despues["ultimo_id"] > antes["ultimo_id"]
    assert gasto["mensajes"] >= 2 and servicio_bot.gasto_ia(SessionLocal())["costo_usd"] >= gasto0["costo_usd"] + 0.00039


# ─────────────────────────── por HTTP: llave, sesión y Excel ───────────────────────────
def test_las_rutas_del_bot_piden_llave_o_sesion(cliente):
    assert cliente.get("/api/bot/tecnicos").status_code == 401
    r = cliente.get("/api/bot/tecnicos", headers={"X-Llave-Chat": "llave-del-chat-de-pruebas"})
    assert r.status_code == 200 and {"AFIK", "NICK"} <= set(r.json())
    assert cliente.get("/api/bot/tecnicos", headers={"X-Llave-Chat": "otra"}).status_code == 401


def test_excel_por_enlace_firmado(cliente, sesion):
    _tanda([{"texto": "j9"}], {"j9": {**CASH300, "job_name": "X-1"}}, tecnico_tanda="AFIK")
    enlaces = cliente.post("/api/bot/excel-enlaces", headers=sesion, json={"semana": ACTUAL}).json()
    assert {"AFIK", "NICK"} <= {e["tecnico"] for e in enlaces}
    ruta = next(e["ruta"] for e in enlaces if e["tecnico"] == "AFIK")
    r = cliente.get(ruta)                                                   # sin sesión: el enlace basta
    assert r.status_code == 200 and r.content[:2] == b"PK"                 # un .xlsx es un zip
    assert "AFIK" in r.headers["content-disposition"]
    assert cliente.get(ruta[:-3] + "xyz").status_code == 403               # alterado
    assert cliente.post("/api/bot/excel-enlaces", headers=sesion,
                        json={"semana": ACTUAL, "tecnico": "nadie"}).status_code == 404


def test_semana_por_http(cliente, sesion):
    ops = cliente.get("/api/bot/semanas", headers=sesion).json()
    assert ops[0]["actual"] and ops[0]["label"] == ACTUAL and len(ops) == 9
    assert cliente.post("/api/bot/semana", headers=sesion, json={"texto": "mañana"}).status_code == 400


# ─────────────────────────── corregir citando (fase 6) ───────────────────────────
def _corrige(wamid, texto, tabla):
    db = SessionLocal()
    try:
        return servicio_bot.corrige(db, wamid, texto, lector=lee(tabla))
    finally:
        db.close()


def test_corregir_citando_cambia_solo_ese_trabajo_y_se_puede_deshacer():
    t = _tanda([{"texto": "k9", "wamid": "w-k-1"}, {"texto": "q9", "wamid": "w-k-2"}],
               {"k9": {**CASH300, "job_name": "K-1"}, "q9": {**CASH300, "job_name": "K-2"}}, tecnico_tanda="AFIK")
    otro = t["resultados"][1]["registro"]["id"]
    # la IA relee «mensaje original + corrección»: el lector falso usa la última línea como llave
    r = _corrige("w-k-1", "son 320", {"CORRECCIÓN (lo que diga aquí manda sobre lo anterior): son 320":
                                      {**CASH300, "job_name": None, "valor_servicio": 320}})
    assert r["estado"] == "creado" and r["registro"]["job_name"] == "K-1"      # el número se conserva
    assert {c["campo"]: (c["antes"], c["despues"]) for c in r["cambios"]} == {"valor": (300, 320), "total": (152.5, 162.5)}
    assert _reg(otro).total == 152.5                                            # el otro trabajo no se tocó
    db = SessionLocal()
    assert servicio_bot.restaura(db, r["registro"]["id"], r["antes"])["estado"] == "restaurado"
    db.close()
    reg = _reg(r["registro"]["id"])
    assert (reg.valor_servicio, reg.total) == (300, 152.5)
    db = SessionLocal()
    m = db.query(MensajeBot).filter(MensajeBot.wamid == "w-k-1").first()
    assert m.tokens_entrada == 1000                                            # «son 320» lo entiende el código: sin IA
    db.close()


def test_corregir_un_rojo_lo_deja_entrar_y_otras_respuestas():
    t = _tanda([{"texto": "z9", "wamid": "w-z-1"}], {"z9": {**CASH300, "job_name": "Z-1", "valor_servicio": 0}},
               tecnico_tanda="AFIK")
    assert t["resultados"][0]["estado"] == "sin_valor"
    clave = "CORRECCIÓN (lo que diga aquí manda sobre lo anterior): 300 cash"
    r = _corrige("w-z-1", "300 cash", {clave: {**CASH300, "job_name": "Z-1"}})
    assert r["estado"] == "creado" and r["registro"]["total"] == 152.5
    assert _corrige("w-no-existe", "300", {})["estado"] == "no_es_trabajo"
    # una corrección que lo dejaría sin calcular no se aplica
    r2 = _corrige("w-z-1", "son 0", {"CORRECCIÓN (lo que diga aquí manda sobre lo anterior): 0":
                                 {**CASH300, "valor_servicio": 0}})
    assert r2["estado"] == "sin_valor" and "No cambié nada" in r2["motivo"]
    assert _reg(r["registro"]["id"]).valor_servicio == 300
    db = SessionLocal()
    servicio_bot.valida(db, [r["registro"]["id"]])
    db.close()
    assert _corrige("w-z-1", "300 cash", {clave: CASH300})["estado"] == "ya_validado"


def test_corregir_por_http(cliente, sesion):
    assert cliente.post("/api/bot/corregir", headers=sesion, json={"wamid": "nada", "texto": "x"}).json() == \
        {"estado": "no_es_trabajo"}
    assert cliente.post("/api/bot/trabajos/999999/restaurar", headers=sesion, json={"antes": {}}).json() == \
        {"estado": "no_existe"}


# ─────────────────────────── fase 7: lo que leen los paneles de GAELA ───────────────────────────
def test_metricas_y_semanas_para_el_panel(cliente, sesion):
    sem = servicio_bot.etiqueta_semana(LUNES - timedelta(weeks=6))
    t = _tanda([{"texto": "a9"}, {"texto": "b9"}], {"a9": {**CASH300, "job_name": "M-1"},
                                                     "b9": {**CASH300, "job_name": "M-2", "tipo_pago": "CC"}},
               tecnico_tanda="AFIK", semana=sem)
    db = SessionLocal()
    servicio_bot.valida(db, [t["resultados"][0]["registro"]["id"]])   # solo uno validado
    db.close()
    s = cliente.get("/api/bot/semanas-totales", headers=sesion, params={"n": 52}).json()
    fila = next(x for x in s if x["semana"] == sem)
    assert (fila["trabajos"], fila["por_validar"], fila["tecnicos"]) == (2, 1, 1) and fila["ventas"] == 600.0
    m = cliente.get("/api/bot/metricas", headers=sesion, params={"n": 26}).json()
    afik = next(x for x in m["tecnicos"] if x["tecnico"] == "AFIK")
    assert afik["trabajos"] >= 1 and afik["mas_hace"] == "LOCKOUT"
    assert [x["fecha_inicio"] for x in m["semanas"]] == sorted(x["fecha_inicio"] for x in m["semanas"])
    d = cliente.get("/api/bot/semana", headers=sesion, params={"semana": sem}).json()
    assert d["existe"] and d["tecnicos"][0]["tecnico"] == "AFIK" and "bloqueados_lista" in d


# ── Dudas: técnico, repetidos y trabajos iguales ──
UNO = {"job_name": "DUDA-1", "job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CASH"}


def test_si_no_sabe_el_tecnico_da_hasta_cinco_opciones_que_contienen_el_nombre():
    nombres = ["AFIK NM", "AFIK COLUMBIA", "AFIK GREENVILLE", "NICK"]
    assert servicio_bot.reconoce_tecnico("Afik ***\nLockout 300 cash", nombres)["candidatos"] == \
        ["AFIK COLUMBIA", "AFIK GREENVILLE", "AFIK NM"]
    muchos = [f"AFIK {n}" for n in "ABCDEFG"]
    assert len(servicio_bot.reconoce_tecnico("Afik\nx 300", muchos)["candidatos"]) == 5
    assert servicio_bot.reconoce_tecnico("American Services Job 12\nx", nombres)["candidatos"] == []


def test_un_job_ya_registrado_dice_donde_esta_y_se_puede_registrar_de_nuevo():
    primero = _tanda([{"texto": "NICK\nya", "wamid": "w-dup-1"}], {"ya": {**UNO, "job_name": "DUP-A"}})
    assert primero["resultados"][0]["estado"] == "creado"
    r = _tanda([{"texto": "NICK\nya otra", "wamid": "w-dup-2"}], {"ya otra": {**UNO, "job_name": "DUP-A"}})["resultados"][0]
    assert r["estado"] == "repetido" and r["ya_registrado"]["nombre"] == "NICK" and r["ya_registrado"]["semana"]
    db = SessionLocal()
    forzado = servicio_bot.resuelve_grupo(db, [r["mensaje_id"]], "todos")["resultados"][0]
    assert forzado["estado"] == "creado"
    assert [a["codigo"] for a in forzado["registro"]["alertas"]].count("repetido") == 1
    assert servicio_bot.resuelve_grupo(db, [r["mensaje_id"]], "todos")["estado"] == "ya_resuelto"
    db.close()


def _grupo(sufijo, textos, tabla):
    r = _tanda([{"texto": t, "wamid": f"w-g-{sufijo}-{i}"} for i, t in enumerate(textos)], tabla)["resultados"]
    assert all(x["estado"] == "duda_grupo" for x in r)
    return r


def test_trabajos_iguales_no_se_registran_hasta_elegir_y_el_mismo_texto_se_lee_una_vez():
    llamadas = []

    def lector(texto):
        llamadas.append(texto)
        return {**UNO, "job_name": "IGUAL-1"}, dict(USO)

    r = servicio_bot.crea_trabajos(SessionLocal(), ACTUAL, [{"texto": "NICK\nigual", "wamid": f"w-i-{n}"} for n in range(2)],
                                   lector=lector)["resultados"]
    assert len(llamadas) == 1 and all(x["estado"] == "duda_grupo" for x in r) and r[0]["iguales"] is True
    db = SessionLocal()
    h = servicio_bot.resuelve_grupo(db, r[0]["grupo"], "uno")
    assert [x["estado"] for x in h["resultados"]] == ["creado"]
    assert db.get(MensajeBot, r[0]["grupo"][1]).estado == "descartado"
    db.close()


def test_mismo_job_con_texto_distinto_deja_elegir_y_ninguno_no_registra():
    tabla = {"a": {**UNO, "job_name": "DIST-1"}, "b": {**UNO, "job_name": "DIST-1", "valor_servicio": 420}}
    r = _grupo("d", ["NICK\na", "NICK\nb"], tabla)
    assert r[0]["iguales"] is False
    db = SessionLocal()
    h = servicio_bot.resuelve_grupo(db, r[0]["grupo"], "elegido", r[0]["grupo"][1])
    assert h["resultados"][0]["registro"]["valor_servicio"] == 420
    db.close()
    otra = {"c": {**UNO, "job_name": "DIST-2"}, "d": {**UNO, "job_name": "DIST-2", "valor_servicio": 420}}
    r2 = _grupo("n", ["NICK\nc", "NICK\nd"], otra)
    db = SessionLocal()
    assert servicio_bot.resuelve_grupo(db, r2[0]["grupo"], "ninguno")["resultados"] == []
    assert servicio_bot.ya_registrado(db, "DIST-2") is None
    db.close()


def test_si_el_job_ya_existia_e_iguales_se_pregunta_una_vez_y_si_son_distintos_no_descarta_ninguno():
    _tanda([{"texto": "NICK\ne0", "wamid": "w-e-0"}], {"e0": {**UNO, "job_name": "EX-1"}})
    iguales = _tanda([{"texto": "NICK\ne1", "wamid": f"w-e-{n}"} for n in (1, 2)], {"e1": {**UNO, "job_name": "EX-1"}})["resultados"]
    assert [x["estado"] for x in iguales] == ["repetido", "descartado"]
    tabla = {"e3": {**UNO, "job_name": "EX-1"}, "e4": {**UNO, "job_name": "EX-1", "valor_servicio": 29}}
    r = _tanda([{"texto": "NICK\ne3", "wamid": "w-e-3"}, {"texto": "NICK\ne4", "wamid": "w-e-4"}], tabla)["resultados"]
    assert [x["estado"] for x in r] == ["duda_grupo", "duda_grupo"] and r[0]["iguales"] is False
    assert r[0]["ya_registrado"]["nombre"] == "NICK"
    db = SessionLocal()
    h = servicio_bot.resuelve_grupo(db, r[0]["grupo"], "elegido", r[1]["mensaje_id"])["resultados"][0]
    assert h["estado"] == "creado" and h["registro"]["valor_servicio"] == 29
    assert "repetido" in [x["codigo"] for x in h["registro"]["alertas"]]
    db.close()


def test_el_repetido_se_dice_antes_de_pedir_tecnico_y_no_se_pregunta_dos_veces():
    _tanda([{"texto": "NICK\nf0", "wamid": "w-f-0"}], {"f0": {**UNO, "job_name": "FUE-1"}})
    r = _tanda([{"texto": "Sin nombre conocido 1\nf1", "wamid": "w-f-1"}], {"f1": {**UNO, "job_name": "FUE-1"}})["resultados"][0]
    assert r["estado"] == "repetido" and r["ya_registrado"]["nombre"] == "NICK"
    db = SessionLocal()
    assert servicio_bot.resuelve_grupo(db, [r["mensaje_id"]], "todos")["resultados"][0]["estado"] == "sin_tecnico"
    assert servicio_bot.completa(db, r["mensaje_id"], {"tecnico": "NICK"})["estado"] == "creado"
    db.close()


def test_sin_numero_de_job_no_entra_y_citando_el_numero_si():
    r = _tanda([{"texto": "NICK" + chr(10) + "sinjob", "wamid": "w-sj-1"}], {"sinjob": {**UNO, "job_name": None}})["resultados"][0]
    assert r["estado"] == "sin_job" and r["motivo"] == "No trae el número del job." and "registro" not in r
    db = SessionLocal()
    h = servicio_bot.corrige(db, "w-sj-1", "ABJ-77", lector=lambda texto: ({**UNO, "job_name": "ABJ-77"}, dict(USO)))
    assert h["estado"] == "creado" and h["registro"]["job_name"] == "ABJ-77"
    db.close()
