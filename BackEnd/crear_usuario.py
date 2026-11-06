"""
Crea (o le cambia la clave a) un usuario del panel. Se corre UNA vez en el servidor, después de publicar la fase 1:

    .venv/Scripts/python.exe crear_usuario.py correo@negocio.com "Nombre"

La clave se pide sin mostrarla en pantalla (o sale de ERP_CLAVE_NUEVA, para un despliegue automático). Usa la base del
.env (la de PRODUCCIÓN en el servidor): por eso no se corre desde el PC salvo con `dev_local` (base local).
"""

import getpass
import os
import sys

from app.db import Base, SessionLocal, engine
from app.models_bot import UsuarioERP
from app.seguridad import hashea


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit('Uso: crear_usuario.py correo@negocio.com "Nombre"')
    email, nombre = sys.argv[1].strip().lower(), sys.argv[2].strip()
    clave = os.environ.get("ERP_CLAVE_NUEVA") or getpass.getpass("Clave (mínimo 10 caracteres): ")
    if len(clave) < 10:
        sys.exit("La clave necesita al menos 10 caracteres.")
    Base.metadata.create_all(bind=engine, tables=[UsuarioERP.__table__])
    db = SessionLocal()
    u = db.query(UsuarioERP).filter(UsuarioERP.email == email).first()
    if u:
        u.clave_hash, u.nombre, u.activo = hashea(clave), nombre, True
        print(f"✓ clave cambiada para {email}")
    else:
        db.add(UsuarioERP(email=email, nombre=nombre, clave_hash=hashea(clave)))
        print(f"✓ usuario {email} creado")
    db.commit()
    db.close()


if __name__ == "__main__":
    main()
