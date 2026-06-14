"""
Script de un solo uso: agrega la columna `participacion` (% propio / trabajo
compartido) a la tabla `registros_virginia` en Neon.

Aditivo y con default 100 → las filas existentes quedan como están (job completo).
Idempotente: si la columna ya existe, no hace nada.

Uso:  ./.venv/Scripts/python.exe agregar_participacion_virginia.py

Rollback:  ALTER TABLE registros_virginia DROP COLUMN participacion;
"""
from sqlalchemy import text
from app.db import engine

SQL = """
ALTER TABLE registros_virginia
ADD COLUMN IF NOT EXISTS participacion DOUBLE PRECISION NOT NULL DEFAULT 100
"""

with engine.begin() as conn:
    conn.execute(text(SQL))
    print("[OK] columna 'participacion' lista en registros_virginia (default 100).")
