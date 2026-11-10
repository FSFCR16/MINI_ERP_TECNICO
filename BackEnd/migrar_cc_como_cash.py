"""
«CC como cash» por contrato (2026-11-09). Se corre ANTES de publicar el código que lo usa: con el código nuevo y sin la
columna, cualquier consulta de contratos falla.

    .venv/Scripts/python.exe migrar_cc_como_cash.py            # solo agrega la columna (apagada en todos)
    .venv/Scripts/python.exe migrar_cc_como_cash.py marcar     # además la enciende en AMI y en todos los AFIK

Idempotente: la columna se agrega solo si no existe y marcar dos veces da lo mismo. No toca ningún trabajo ya registrado
(solo los NUEVOS de esos contratos nacen con «cc como cash»). Usa la base del .env (la de producción): solo con el
permiso del dueño. Deshacer lo marcado: UPDATE tecnicos SET cc_como_cash = FALSE WHERE id IN (...los que imprime...).
"""

import sys

from sqlalchemy import inspect, text

from app.db import engine

MARCAR = "nombre = 'AMI' OR nombre LIKE 'AFIK%'"


def main() -> None:
    existentes = {c["name"] for c in inspect(engine).get_columns("tecnicos")}
    with engine.begin() as con:
        if "cc_como_cash" not in existentes:
            con.execute(text("ALTER TABLE tecnicos ADD COLUMN cc_como_cash BOOLEAN NOT NULL DEFAULT FALSE"))
            print("✓ tecnicos.cc_como_cash (apagada en todos)")
        else:
            print("· tecnicos.cc_como_cash ya existía")
        if len(sys.argv) > 1 and sys.argv[1] == "marcar":
            filas = con.execute(text(f"UPDATE tecnicos SET cc_como_cash = TRUE WHERE {MARCAR} RETURNING id, nombre, job")).all()
            for id_, nombre, job in filas:
                print(f"✓ encendido: {id_} {nombre} · {job}")
            print(f"{len(filas)} contratos con «cc como cash»")


if __name__ == "__main__":
    main()
