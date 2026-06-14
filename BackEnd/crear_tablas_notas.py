"""
Script de UN SOLO USO para crear las tablas de NOTAS en Neon.
Aditivo: create_all solo crea lo que no existe, no altera tablas existentes.

Uso (desde BackEnd con el venv):
    .venv/Scripts/python.exe crear_tablas_notas.py

Rollback: DROP TABLE notas_tecnico, notas_virginia;
"""
from app.db import Base, engine

# Importar los modelos (y sus tablas FK objetivo) registra todo en Base.metadata
import app.models            # noqa: F401  (semanas_tecnico)
import app.models_virginia   # noqa: F401  (tecnicos_virginia, semanas_virginia)
import app.models_notas      # noqa: F401  (notas_tecnico, notas_virginia)

TABLAS = ["notas_tecnico", "notas_virginia"]


def main():
    print("Creando tablas de NOTAS (solo las que no existen)...")
    Base.metadata.create_all(bind=engine)
    print("Listo. Tablas objetivo:")
    for t in TABLAS:
        print(f"  - {t}")


if __name__ == "__main__":
    main()
