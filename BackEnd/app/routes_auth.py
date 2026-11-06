"""Entrar al panel (plan del bot, fase 1): correo y clave → un token de sesión de 30 días. Desde la app de GAELA se
entra sin clave: el chat pide un pase de un solo uso (`/auth/pase-chat`) y el panel lo canjea (`/auth/canjear`)."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import seguridad
from app.db import get_db
from app.models_bot import PaseUsado, UsuarioERP

router = APIRouter(prefix="/auth", tags=["auth"])


class Entrada(BaseModel):
    email: str
    clave: str


@router.post("/entrar")
def entrar(body: Entrada, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if seguridad.frenado(email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Demasiados intentos. Espera 10 minutos y vuelve a intentar.")
    u = db.query(UsuarioERP).filter(UsuarioERP.email == email, UsuarioERP.activo.is_(True)).first()
    if not u or not seguridad.verifica(body.clave, u.clave_hash):
        seguridad.anota_fallo(email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o clave incorrectos.")
    seguridad.limpia_fallos(email)
    return {"token": seguridad.token_de_sesion(u.id), "nombre": u.nombre, "dura": seguridad.DURACION_SESION}


@router.get("/yo")
def yo(quien: seguridad.Quien = Depends(seguridad.requiere_acceso), db: Session = Depends(get_db)):
    if quien.tipo == "chat":
        return {"tipo": "chat", "nombre": "Bot del chat"}
    u = db.get(UsuarioERP, quien.usuario)
    if not u or not u.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tu sesión terminó. Vuelve a entrar.")
    return {"tipo": "persona", "nombre": u.nombre, "email": u.email}


class PideParaPase(BaseModel):
    email: str
    nombre: str = ""


@router.post("/pase-chat")
def pase_chat(body: PideParaPase, quien: seguridad.Quien = Depends(seguridad.requiere_acceso),
              db: Session = Depends(get_db)):
    """Solo el chat (con su llave): la persona ya entró a la app de GAELA con su cuenta. Si aún no tiene usuario en el
    ERP, se le crea uno SIN clave (solo podrá entrar así, desde la app, hasta que se le ponga una)."""
    if quien.tipo != "chat":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo desde la app de GAELA.")
    email = body.email.strip().lower()
    if "@" not in email or len(email) > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta el correo de quien entra.")
    u = db.query(UsuarioERP).filter(UsuarioERP.email == email).first()
    if u is None:
        u = UsuarioERP(email=email, nombre=(body.nombre.strip() or email)[:120],
                       clave_hash="sin-clave:" + secrets.token_hex(16))   # nunca coincide con una clave
        db.add(u)
        db.commit()
    if not u.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ese usuario del ERP está desactivado.")
    return {"pase": seguridad.pase(u.id, secrets.token_hex(12))}


class Canje(BaseModel):
    pase: str


@router.post("/canjear")
def canjear(body: Canje, db: Session = Depends(get_db)):
    d = seguridad.lee_pase(body.pase)
    if not d:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El enlace venció. Ábrelo otra vez desde la app.")
    try:
        db.add(PaseUsado(jti=d["j"]))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ese enlace ya se usó. Ábrelo otra vez desde la app.")
    u = db.get(UsuarioERP, int(d["u"]))
    if not u or not u.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ese usuario del ERP está desactivado.")
    return {"token": seguridad.token_de_sesion(u.id), "nombre": u.nombre, "dura": seguridad.DURACION_SESION}
