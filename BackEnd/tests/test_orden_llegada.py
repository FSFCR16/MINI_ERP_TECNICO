"""tests/test_orden_llegada.py — D-381: el panel y el Excel ordenan por cuándo LLEGÓ el mensaje, no por cuándo se guardó.
Contractors 2026-11-16: un repetido aceptado tarde quedaba de último aunque su mensaje llegó antes."""

import time

from app import controllers
from app.db import SessionLocal
from tests.test_bot import ACTUAL, _tanda, tecnicos  # noqa: F401 — los técnicos de prueba

T0 = time.time() - 3600


def _ia(job):
    return {"job_name": job, "job_type": "LOCKOUT", "valor_servicio": 300, "tipo_pago": "CASH"}


def test_lo_que_llego_antes_va_antes_aunque_se_guarde_despues():
    # Primera tanda: llegan el 1 y el 3. El 2 (llegó en medio) se guarda DESPUÉS, en otra tanda.
    _tanda([{"texto": "ORD-1", "wamid": "w-ord-1", "recibido": T0},
            {"texto": "ORD-3", "wamid": "w-ord-3", "recibido": T0 + 20}],
           {"ORD-1": _ia("ORD-1"), "ORD-3": _ia("ORD-3")}, tecnico_tanda="AFIK")
    _tanda([{"texto": "ORD-2", "wamid": "w-ord-2", "recibido": T0 + 10}], {"ORD-2": _ia("ORD-2")}, tecnico_tanda="AFIK")
    db = SessionLocal()
    try:
        filas = [r for r in controllers.obtenerRegistrosSemana("AFIK", ACTUAL, db) if r["job_name"].startswith("ORD-")]
    finally:
        db.close()
    assert [r["job_name"] for r in filas] == ["ORD-1", "ORD-2", "ORD-3"]
    llegada = [r["orden_llegada"] for r in filas]
    assert llegada == sorted(llegada)                       # el número que usa el panel para «Recientes»/«Antiguos»
    assert filas[1]["id"] > filas[2]["id"]                  # aunque el 2 se guardó después (id mayor)
