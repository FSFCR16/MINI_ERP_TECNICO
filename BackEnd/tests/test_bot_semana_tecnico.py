"""Plan del bot §4 y §5: la semana siempre con fechas y el técnico por nombre exacto o casi exacto (sin apodos)."""

from datetime import date

import pytest

from app.servicio_bot import opciones_semana, reconoce_tecnico, resuelve_semana, texto_rango

HOY = date(2026, 11, 6)        # viernes de la semana ISO 45 (2 – 8 nov)
NOMBRES = ["AFIK", "NICK", "JUAN CARLOS", "ANNA", "ANA"]


def test_los_botones_son_la_actual_y_la_pasada_con_sus_fechas():
    ops = opciones_semana(HOY)
    assert [o["texto"] for o in ops[:2]] == ["2 – 8 nov", "26 oct – 1 nov"]
    assert ops[0]["label"] == "2026_11_semana_45" and ops[0]["actual"] and not ops[1]["actual"]
    assert ops[1]["label"] == "2026_10_semana_44" and len(ops) == 9


@pytest.mark.parametrize("texto,label", [
    ("semana 44", "2026_10_semana_44"), ("44", "2026_10_semana_44"), ("Semana #45", "2026_11_semana_45"),
    ("3/11", "2026_11_semana_45"), ("3/11/2026", "2026_11_semana_45"), ("2026-11-03", "2026_11_semana_45"),
    ("3 nov", "2026_11_semana_45"), ("3 de noviembre", "2026_11_semana_45"), ("1/11", "2026_10_semana_44"),
    ("2026_10_semana_44", "2026_10_semana_44"),
    ("31/12/2025", "2026_12_semana_1"),   # como la app: año ISO (2026) + mes del lunes (29 dic) + semana ISO
])
def test_resuelve_semana(texto, label):
    s = resuelve_semana(texto, HOY)
    assert s and s["label"] == label, s


@pytest.mark.parametrize("texto", ["semana 46", "20/11/2026", "mañana", "", "semana 99", "31/02"])
def test_nunca_una_semana_futura_ni_algo_que_no_se_entiende(texto):
    assert resuelve_semana(texto, HOY) is None


def test_semana_alta_en_enero_es_la_de_diciembre_pasado():
    assert resuelve_semana("semana 50", date(2026, 1, 14))["label"] == "2025_12_semana_50"


def test_rango_que_cruza_de_mes_y_de_anio():
    assert texto_rango(date(2025, 12, 29)) == "29 dic – 4 ene"


@pytest.mark.parametrize("texto,nombre,solo", [
    ("AFIK", "AFIK", True), ("afik", "AFIK", True), ("  Afik!!  ", "AFIK", True),
    ("Afik ***\nLockout 300 cash", "AFIK", False),             # C: nombre arriba
    ("Juan Carlos\n300 cash", "JUAN CARLOS", False),
    ("AFIKK", "AFIK", True),                                     # casi exacto (una letra de más)
    ("Ana", "ANA", True), ("Anna", "ANNA", True),                 # exactos ganan: no se confunden
    ("Lockout 300 cash\nAfik", None, False),                     # el nombre abajo NO cuenta
    ("300 cash", None, False), ("ok", None, True),               # con números nunca es una marca
])
def test_reconoce_tecnico(texto, nombre, solo):
    r = reconoce_tecnico(texto, NOMBRES)
    assert (r["nombre"], r["solo_nombre"]) == (nombre, solo)


def test_un_nombre_que_no_esta_ofrece_parecidos_y_no_adivina():
    r = reconoce_tecnico("Nik", NOMBRES)     # 3 letras: no se acepta solo
    assert r["nombre"] is None and r["solo_nombre"] and "NICK" in r["candidatos"]
    assert reconoce_tecnico("Pedro", NOMBRES) == {"nombre": None, "candidatos": [], "solo_nombre": True}
