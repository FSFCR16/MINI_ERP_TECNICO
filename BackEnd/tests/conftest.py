"""Las pruebas corren contra una base SQLite TEMPORAL: nunca contra la del .env (que es la de producción)."""

import os
import sys
import tempfile
from pathlib import Path

_BASE = Path(tempfile.mkdtemp(prefix="erp-pruebas-")) / "pruebas.sqlite3"
os.environ["POSTGRES_URL"] = f"sqlite:///{_BASE.as_posix()}"
os.environ["API_KEY_CHAT"] = "sk-pruebas-sin-uso"
os.environ["API_KEY_GROQ"] = "gsk-pruebas-sin-uso"
os.environ["ERP_SECRETO"] = "secreto-de-las-pruebas-1234567890"
os.environ["ERP_LLAVE_CHAT"] = "llave-del-chat-de-pruebas"
os.environ["ERP_ORIGENES"] = "http://panel.local"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
import app.models  # noqa: E402,F401
import app.models_bot  # noqa: E402,F401
import app.models_notas  # noqa: E402,F401
import app.models_virginia  # noqa: E402,F401
from app.main import app as aplicacion  # noqa: E402
from app.models_bot import UsuarioERP  # noqa: E402
from app.seguridad import hashea  # noqa: E402

Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="session")
def cliente():
    return TestClient(aplicacion)


@pytest.fixture(scope="session")
def usuario():
    db = SessionLocal()
    if not db.query(UsuarioERP).filter(UsuarioERP.email == "dueno@erp.local").first():
        db.add(UsuarioERP(email="dueno@erp.local", nombre="Dueño", clave_hash=hashea("una-clave-larga")))
        db.commit()
    db.close()
    return ("dueno@erp.local", "una-clave-larga")


@pytest.fixture(scope="session")
def sesion(cliente, usuario):
    r = cliente.post("/auth/entrar", json={"email": usuario[0], "clave": usuario[1]})
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(autouse=True)
def _sin_ia_real_en_el_vocabulario(monkeypatch):
    """D-381: abrir Lectura de la IA dispara la búsqueda semanal de palabras; en las pruebas NUNCA va a OpenAI."""
    from app import vocabulario

    def no(*_a, **_k):
        raise AssertionError("una prueba intentó llamar a la IA real del vocabulario")
    monkeypatch.setattr(vocabulario, "_pide_ia", no)
    vocabulario.invalidar()
    yield
    vocabulario.invalidar()
