"""
Script de UN SOLO USO para crear las tablas del módulo VIRGINIA en Neon.

`create_all` solo crea las tablas que NO existen — saltea las generales ya creadas.
Es aditivo: no altera ni borra nada existente.

Uso (desde la carpeta BackEnd, con el venv activo):
    python crear_tablas_virginia.py

Rollback (si algo sale mal): DROP TABLE manual de las 6 tablas nuevas:
    partes_virginia, registros_virginia, semanas_virginia,
    metodos_pago_virginia, config_virginia, tecnicos_virginia
"""
from app.db import Base, engine

# Importar los modelos registra las tablas en Base.metadata
import app.models_virginia  # noqa: F401

TABLAS_VIRGINIA = [
    "tecnicos_virginia",
    "config_virginia",
    "metodos_pago_virginia",
    "semanas_virginia",
    "registros_virginia",
    "partes_virginia",
]


def main():
    print("Creando tablas del módulo VIRGINIA (solo las que no existen)...")
    # checkfirst=True (default) => no recrea las que ya existen
    Base.metadata.create_all(bind=engine)
    print("Listo. Tablas objetivo:")
    for t in TABLAS_VIRGINIA:
        print(f"  - {t}")


if __name__ == "__main__":
    main()
