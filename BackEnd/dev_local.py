"""
dev_local.py — el ERP corriendo EN EL PC, sin tocar nada real (plan del bot, 2026-11-06).

    cd BackEnd
    .venv/Scripts/python.exe dev_local.py crear     # crea las tablas en la base local (idempotente)
    .venv/Scripts/python.exe dev_local.py web       # la API en http://localhost:8001

🔴 El `.env` de esta carpeta apunta a la base de PRODUCCIÓN (Neon). Este arrancador lo PISA antes de importar la app:
- la base es un archivo SQLite local (`mini_erp_dev.sqlite3`, fuera de Git) — o un Postgres LOCAL si se da
  `PG_ADMIN_DSN` (postgres://usuario:clave@localhost:5432/postgres; se usa la base `mini_erp_dev`);
- las claves de IA son falsas: una llamada a OpenAI falla con «no autorizado» y no gasta nada.
Se niega a arrancar si la base no es local.

Por qué los imports de `app` van DESPUÉS de `_entorno()` (y no arriba del todo): `app.db` crea la conexión al
importarse, con la base que haya en el entorno en ese momento. Si se importara antes, se conectaría a PRODUCCIÓN.
Es el mismo patrón de `tests/conftest.py` (de ahí los `# noqa: E402`).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
import uvicorn
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

AQUI = Path(__file__).resolve().parent
BASE_DEV = "mini_erp_dev"
PUERTO = 8001


def _entorno() -> str:
    """Pisa el .env de producción ANTES de importar la app (load_dotenv no sobreescribe lo que ya está)."""
    admin = os.environ.get("PG_ADMIN_DSN", "")
    if admin:
        if urlparse(admin).hostname not in ("localhost", "127.0.0.1"):
            sys.exit("PG_ADMIN_DSN no es localhost: este arrancador solo trabaja con una base LOCAL.")
        url = (admin.rsplit("/", 1)[0] + "/" + BASE_DEV).replace("postgres://", "postgresql://", 1)
    else:
        url = f"sqlite:///{(AQUI / (BASE_DEV + '.sqlite3')).as_posix()}"
    os.environ["POSTGRES_URL"] = url
    os.environ["API_KEY_CHAT"] = "sk-local-sin-uso"       # OpenAI: falla sin gastar
    os.environ["API_KEY_GROQ"] = "gsk-local-sin-uso"
    os.environ.setdefault("URLFRONT", "http://localhost:3000")
    os.environ.setdefault("ERP_SECRETO", "secreto-local-solo-para-el-pc")
    os.environ.setdefault("ERP_ORIGENES", "http://localhost:3000")
    os.environ.setdefault("ERP_LLAVE_CHAT", "llave-local-del-chat")
    host = urlparse(url).hostname
    assert url.startswith("sqlite") or host in ("localhost", "127.0.0.1"), "¡no es la base local!"
    return url


URL_LOCAL = _entorno()   # 🔴 antes de importar la app (ver arriba)

from app.db import Base, engine  # noqa: E402
import app.models  # noqa: E402,F401
import app.models_bot  # noqa: E402,F401  (las tablas del bot y de la sesión)
import app.models_notas  # noqa: E402,F401
import app.models_virginia  # noqa: E402,F401


def crear() -> None:
    if URL_LOCAL.startswith("postgresql"):
        con = psycopg2.connect(os.environ["PG_ADMIN_DSN"])
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with con.cursor() as c:
            c.execute("SELECT 1 FROM pg_database WHERE datname = %s", (BASE_DEV,))
            if not c.fetchone():
                c.execute(f'CREATE DATABASE "{BASE_DEV}"')
        con.close()
    Base.metadata.create_all(bind=engine)
    print("✓ tablas listas en la base local")


def web() -> None:
    uvicorn.run("app.main:app", host="127.0.0.1", port=PUERTO, reload=False)


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else "web"
    {"crear": crear, "web": web}.get(orden, web)()
