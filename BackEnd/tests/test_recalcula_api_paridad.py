"""Plan del bot, fase 2 · paridad DE PUNTA A PUNTA: no solo la fórmula, también cómo el servidor arma la entrada desde
la fila guardada. Se toman casos que generó la fórmula del panel (`paridad/casos.json.gz`), se guardan por el endpoint
real (crear y editar en bloque) y el total que devuelve —y que queda en la base— tiene que ser el del panel."""

import gzip
import json
import random
from datetime import date
from pathlib import Path

import pytest

from app.db import SessionLocal
from app.models import SemanaTecnico, Trabajo, registrosSchemma

DATOS = json.loads(gzip.decompress((Path(__file__).resolve().parent / "paridad" / "casos.json.gz").read_bytes()))
SEMANA = "2026_10_semana_44"
MUESTRA = 600


@pytest.fixture(scope="module")
def tecnico():
    db = SessionLocal()
    t = db.query(Trabajo).filter(Trabajo.nombre == "PARIDAD API").first()
    if not t:
        # contrato a propósito DISTINTO de los casos: la fila manda, el contrato solo rellena lo que falta
        t = Trabajo(nombre="PARIDAD API", job="LOCKOUT", porcentaje_tecnico=1, porcentaje_gil=99, adicional_dolar=77,
                    minimo=777, porcentaje_cc=1, cargo_sabados=0, porcentaje_adicional_empresa=33)
        db.add(t)
        if not db.query(SemanaTecnico).filter(SemanaTecnico.semana == SEMANA).first():
            db.add(SemanaTecnico(year_num=2026, numero_semana=44, semana=SEMANA, fecha_inicio=date(2026, 10, 26),
                                 fecha_fin=date(2026, 11, 1)))
        db.commit()
    tid = t.id
    db.close()
    return tid


def _muestra(semilla):
    rnd = random.Random(semilla)
    return rnd.sample(DATOS["casos"], MUESTRA)


def _fila(tid, i, e):
    return {"id": f"tmp-{i}", "id_tecnico": tid, "nombre": "PARIDAD API", "job": "LOCKOUT", "job_name": f"P{i}",
            "valor_servicio": e["valor_servicio"], "porcentaje_tecnico": e["porcentaje_tecnico"], "minimo": e["minimo"],
            "opciones_pago": [], "tipo_pago": e["tipo_pago"], "valor_tarjeta": e["valor_tarjeta"],
            "valor_efectivo": e["valor_efectivo"], "porcentaje_cc": e["porcentaje_cc"], "partes_gil": e["partes_gil"],
            "partes_tecnico": e["partes_tecnico"], "tech": e["tech"], "subtotal": 0, "total": e["total"],
            "adicional_dolar": e["adicional_dolar"], "notas": [], "is_cash": e["is_cash"],
            "aplica_dolar_empresa": e["aplica_dolar_empresa"], "dolar_adicional_empresa": e["dolar_adicional_empresa"]}


def _iguales(a, b):
    return (a is None and b is None) or (a is not None and b is not None and float(a) == float(b))


def test_crear_por_el_endpoint_da_el_total_del_panel(cliente, sesion, tecnico):
    casos = _muestra(44)
    filas = [_fila(tecnico, i, c["entrada"]) for i, c in enumerate(casos)]
    r = cliente.post("/api/registrosDataBase", headers=sesion, json={"semana": SEMANA, "registros": filas})
    assert r.status_code == 200, r.text
    devueltas = r.json()["registros"]
    assert len(devueltas) == MUESTRA
    malos = [(c["entrada"], d["total"], c["salida"]["total"]) for c, d in zip(casos, devueltas)
             if not _iguales(d["total"], c["salida"]["total"])]
    assert not malos, f"{len(malos)} de {MUESTRA} distintos; el primero: {malos[0]}"
    db = SessionLocal()                                   # y lo guardado es lo mismo que lo devuelto
    for c, d in zip(casos[:50], devueltas[:50]):
        assert _iguales(db.get(registrosSchemma, d["id"]).total, c["salida"]["total"])
    db.close()


def test_editar_en_bloque_cambia_de_caso_y_recalcula(cliente, sesion, tecnico):
    """Se guarda un caso y se edita convirtiéndolo en OTRO caso cualquiera: el total tiene que ser el del segundo."""
    primeros, segundos = _muestra(1), _muestra(2)
    r = cliente.post("/api/registrosDataBase", headers=sesion,
                     json={"semana": SEMANA, "registros": [_fila(tecnico, i, c["entrada"]) for i, c in enumerate(primeros)]})
    ids = [d["id"] for d in r.json()["registros"]]
    cambios = []
    for rid, c in zip(ids, segundos):
        e = c["entrada"]
        cambios.append({"id": rid, **{k: e[k] for k in ("valor_servicio", "tipo_pago", "valor_tarjeta", "valor_efectivo",
                                                        "porcentaje_cc", "partes_gil", "partes_tecnico", "tech",
                                                        "porcentaje_tecnico", "is_cash", "aplica_dolar_empresa",
                                                        "adicional_dolar")}, "total": e["total"]})
    # el contrato de estos casos (mínimo, dólar empresa) es el del primero: se igualan al segundo directo en la base
    db = SessionLocal()
    for rid, c in zip(ids, segundos):
        reg = db.get(registrosSchemma, rid)
        reg.minimo, reg.dolar_adicional_empresa = c["entrada"]["minimo"], c["entrada"]["dolar_adicional_empresa"]
    db.commit()
    db.close()
    r2 = cliente.put("/api/bulk-update-registros", headers=sesion, json=cambios)
    assert r2.status_code == 200, r2.text
    malos = [(c["entrada"], d["total"], c["salida"]["total"]) for c, d in zip(segundos, r2.json()["registros"])
             if not _iguales(d["total"], c["salida"]["total"])]
    assert not malos, f"{len(malos)} de {MUESTRA} distintos; el primero: {malos[0]}"


def test_guardar_dos_veces_lo_mismo_no_cambia_el_total(cliente, sesion, tecnico):
    """Idempotencia: volver a guardar una fila sin cambios deja el mismo total (no se acumula el adicional, etc.)."""
    casos = _muestra(3)[:150]
    r = cliente.post("/api/registrosDataBase", headers=sesion,
                     json={"semana": SEMANA, "registros": [_fila(tecnico, i, c["entrada"]) for i, c in enumerate(casos)]})
    devueltas = r.json()["registros"]
    for _ in range(2):
        r2 = cliente.put("/api/bulk-update-registros", headers=sesion,
                         json=[{"id": d["id"], "job_name": d["job_name"]} for d in devueltas])
        assert [x["total"] for x in r2.json()["registros"]] == [d["total"] for d in devueltas]
