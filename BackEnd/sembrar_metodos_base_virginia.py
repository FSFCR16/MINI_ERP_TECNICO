"""
Script de un solo uso: siembra los métodos de pago base (Cash, CC) en TODOS los
técnicos Virginia existentes. Idempotente (no duplica los que ya existen).

Uso:  ./.venv/Scripts/python.exe sembrar_metodos_base_virginia.py
"""
from app.db import SessionLocal
from app.models_virginia import TecnicoVirginia
from app.controllers_virginia import _sembrar_metodos_base

db = SessionLocal()
try:
    tecnicos = db.query(TecnicoVirginia).all()
    for t in tecnicos:
        _sembrar_metodos_base(t.id, db)
        print(f"[OK] {t.nombre}")
    print(f"\nListo. {len(tecnicos)} tecnicos revisados.")
finally:
    db.close()
