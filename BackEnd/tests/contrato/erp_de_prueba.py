"""
ERP de verdad para la PRUEBA DE CONTRATO con el chat de GAELA (D-338): SQLite temporal (vacía cada vez), IA simulada,
puerto 8011. Nada externo: ni producción, ni OpenAI, ni WhatsApp.

    cd BackEnd && .venv/Scripts/python.exe tests/contrato/erp_de_prueba.py          # deja el ERP corriendo
    # en otra terminal, en sistema-inventario/backend:
    ERP_CONTRATO_URL=http://127.0.0.1:8011 ERP_CONTRATO_LLAVE=llave-contrato
        .venv/Scripts/python.exe -m pytest tests/test_puerto_tecnicos_contrato.py

Levántalo de nuevo antes de cada corrida (el resumen de la prueba cuenta los trabajos de la semana).
"""
import os
import re
import sys
import tempfile

ERP = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ERP)
os.chdir(ERP)
db = os.path.join(tempfile.mkdtemp(), "contrato.sqlite3")
os.environ.update(POSTGRES_URL=f"sqlite:///{db}", API_KEY_CHAT="sk-sin-uso", API_KEY_GROQ="x", URLFRONT="http://localhost",
                  ERP_SECRETO="secreto-del-contrato-1234567890", ERP_LLAVE_CHAT="llave-contrato",
                  ERP_ORIGENES="http://localhost")

from app.db import Base, SessionLocal, engine  # noqa: E402
import app.models, app.models_bot, app.models_notas, app.models_virginia  # noqa: E402,F401
from app import servicio_bot  # noqa: E402
from app.models import Trabajo  # noqa: E402

Base.metadata.create_all(bind=engine)
s = SessionLocal()
s.add_all([Trabajo(nombre="AFIK", job="LOCKOUT", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=2.5, minimo=50,
                   porcentaje_cc=3, cargo_sabados=0, porcentaje_adicional_empresa=0),
           Trabajo(nombre="NICK", job="TODO", porcentaje_tecnico=50, porcentaje_gil=50, adicional_dolar=0, minimo=40,
                   porcentaje_cc=4, cargo_sabados=0, porcentaje_adicional_empresa=0)])
s.commit()
s.close()


def lector(texto):
    """IA simulada: el job es la primera palabra en mayúsculas; el valor, el último número de la última línea;
    «cc» en la última línea = tarjeta. Sin números = sin valor."""
    ultima = texto.strip().splitlines()[-1]
    nums = re.findall(r"\d+", ultima)
    job = re.findall(r"\b[A-Z]{3,}[A-Z0-9-]*\b", texto)
    return ({"job_name": job[0] if job else None, "job_type": "LOCKOUT", "valor_servicio": float(nums[-1]) if nums else 0,
             "tipo_pago": "CC" if " cc" in ultima.lower() else "CASH", "date": None},
            {"modelo": "simulado", "version_prompt": "contrato", "tokens_entrada": 500, "tokens_salida": 100})


servicio_bot._lector_por_defecto = lector

import uvicorn  # noqa: E402
from app.main import app  # noqa: E402

uvicorn.run(app, host="127.0.0.1", port=8011, log_level="warning")
