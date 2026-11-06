"""
Plan del bot, fase 2 · VALIDACIÓN CON LO GUARDADO, SOLO LEYENDO. Antes de que el servidor empiece a mandar en el total,
recalcula todos los trabajos guardados con la fórmula del servidor (la misma del panel) y lista los que darían distinto.
Cada diferencia se revisa con el dueño: puede ser un error o una corrección hecha a mano.

    .venv/Scripts/python.exe compara_guardados.py            # escribe diferencias_guardados.csv

🔴 No escribe NADA en la base: la transacción es de solo lectura. Usa la base del .env (la de producción): se corre solo
con el permiso del dueño.
"""

import csv
from collections import Counter

from sqlalchemy import text

from app import calculo
from app.db import SessionLocal
from app.models import Trabajo, registrosSchemma
from app.servicio_calculo import entrada


def main() -> None:
    db = SessionLocal()
    db.execute(text("SET TRANSACTION READ ONLY"))
    contratos = {t.id: t for t in db.query(Trabajo).all()}
    total, iguales, distintos = 0, 0, []
    por_tipo: Counter = Counter()
    for r in db.query(registrosSchemma).yield_per(500):
        total += 1
        e = entrada(r, contratos.get(r.tecnico_id))
        nuevo = calculo.procesar(e).get("total")
        if r.total is not None and nuevo is not None and float(nuevo) == float(r.total):
            iguales += 1
            continue
        por_tipo[e["tipo_pago"]] += 1
        distintos.append({"id": r.id, "tecnico": r.nombre, "job": r.job, "job_name": r.job_name, "semana_id": r.semana_id,
                          "tipo_pago": e["tipo_pago"], "guardado": r.total, "servidor": nuevo,
                          "diferencia": (float(nuevo or 0) - float(r.total or 0))})
    db.rollback()
    db.close()
    with open("diferencias_guardados.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "tecnico", "job", "job_name", "semana_id", "tipo_pago", "guardado",
                                          "servidor", "diferencia"])
        w.writeheader()
        w.writerows(distintos)
    print(f"{total} trabajos · {iguales} iguales · {len(distintos)} distintos {dict(por_tipo)} → diferencias_guardados.csv")


if __name__ == "__main__":
    main()
