"""
Rutas + lógica de NOTAS (CRUD) para ambos módulos. Autocontenido: schemas,
controladores y router en un solo archivo para no tocar los routers grandes.

Modelo: notas por (técnico, semana). Las predeterminadas se "siembran" (seed) la
primera vez que se abren las notas de esa semana, y desde ahí son 100% editables.

General:  /api/notas/...           (identifica por nombre + semana label)
Virginia: /api/virginia/notas/...  (identifica por técnico + semana label)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.db import get_db
from app.models import SemanaTecnico
from app.models_virginia import TecnicoVirginia, SemanaVirginia
from app.models_notas import NotaTecnico, NotaVirginia

router = APIRouter(tags=["notas"], redirect_slashes=False)


# ── Schemas ──────────────────────────────────────────
class NotaCreate(BaseModel):
    nombre: str
    semana: str
    texto: str
    orden: int = 0


class NotaSeed(BaseModel):
    nombre: str
    semana: str
    notas: List[str]


class NotaUpdate(BaseModel):
    texto: Optional[str] = None
    orden: Optional[int] = None


def _nota_dict(n):
    return {"id": n.id, "texto": n.texto, "orden": n.orden}


# ══════════════════════════════════════════════
#  GENERAL — /api/notas
# ══════════════════════════════════════════════
def _semana_general(label: str, db: Session):
    sem = db.query(SemanaTecnico).filter(SemanaTecnico.semana == label).first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semana no encontrada")
    return sem


@router.get("/api/notas/{nombre}/{semana}")
def listar_notas_general(nombre: str, semana: str, db: Session = Depends(get_db)):
    sem = _semana_general(semana, db)
    notas = (
        db.query(NotaTecnico)
        .filter(NotaTecnico.nombre == nombre, NotaTecnico.semana_id == sem.id)
        .order_by(NotaTecnico.orden.asc(), NotaTecnico.id.asc())
        .all()
    )
    return [_nota_dict(n) for n in notas]


@router.post("/api/notas/seed")
def seed_notas_general(data: NotaSeed, db: Session = Depends(get_db)):
    sem = _semana_general(data.semana, db)
    existentes = (
        db.query(NotaTecnico)
        .filter(NotaTecnico.nombre == data.nombre, NotaTecnico.semana_id == sem.id)
        .order_by(NotaTecnico.orden.asc(), NotaTecnico.id.asc())
        .all()
    )
    if existentes:
        return [_nota_dict(n) for n in existentes]
    creadas = []
    for i, texto in enumerate(data.notas):
        n = NotaTecnico(nombre=data.nombre, semana_id=sem.id, texto=texto, orden=i)
        db.add(n)
        creadas.append(n)
    db.commit()
    for n in creadas:
        db.refresh(n)
    return [_nota_dict(n) for n in creadas]


@router.post("/api/notas")
def crear_nota_general(data: NotaCreate, db: Session = Depends(get_db)):
    sem = _semana_general(data.semana, db)
    n = NotaTecnico(nombre=data.nombre, semana_id=sem.id, texto=data.texto, orden=data.orden)
    db.add(n)
    db.commit()
    db.refresh(n)
    return _nota_dict(n)


@router.put("/api/notas/{id}")
def actualizar_nota_general(id: int, data: NotaUpdate, db: Session = Depends(get_db)):
    n = db.query(NotaTecnico).filter(NotaTecnico.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    if data.texto is not None:
        n.texto = data.texto
    if data.orden is not None:
        n.orden = data.orden
    db.commit()
    db.refresh(n)
    return _nota_dict(n)


@router.delete("/api/notas/{id}")
def eliminar_nota_general(id: int, db: Session = Depends(get_db)):
    n = db.query(NotaTecnico).filter(NotaTecnico.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(n)
    db.commit()
    return {"message": "Nota eliminada"}


# ══════════════════════════════════════════════
#  VIRGINIA — /api/virginia/notas
# ══════════════════════════════════════════════
def _resolver_virginia(nombre: str, semana: str, db: Session):
    tec = db.query(TecnicoVirginia).filter(TecnicoVirginia.nombre == nombre).first()
    if not tec:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    sem = db.query(SemanaVirginia).filter(SemanaVirginia.semana == semana).first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semana no encontrada")
    return tec, sem


@router.get("/api/virginia/notas/{nombre}/{semana}")
def listar_notas_virginia(nombre: str, semana: str, db: Session = Depends(get_db)):
    tec, sem = _resolver_virginia(nombre, semana, db)
    notas = (
        db.query(NotaVirginia)
        .filter(NotaVirginia.tecnico_virginia_id == tec.id, NotaVirginia.semana_virginia_id == sem.id)
        .order_by(NotaVirginia.orden.asc(), NotaVirginia.id.asc())
        .all()
    )
    return [_nota_dict(n) for n in notas]


@router.post("/api/virginia/notas/seed")
def seed_notas_virginia(data: NotaSeed, db: Session = Depends(get_db)):
    tec, sem = _resolver_virginia(data.nombre, data.semana, db)
    existentes = (
        db.query(NotaVirginia)
        .filter(NotaVirginia.tecnico_virginia_id == tec.id, NotaVirginia.semana_virginia_id == sem.id)
        .order_by(NotaVirginia.orden.asc(), NotaVirginia.id.asc())
        .all()
    )
    if existentes:
        return [_nota_dict(n) for n in existentes]
    creadas = []
    for i, texto in enumerate(data.notas):
        n = NotaVirginia(tecnico_virginia_id=tec.id, semana_virginia_id=sem.id, texto=texto, orden=i)
        db.add(n)
        creadas.append(n)
    db.commit()
    for n in creadas:
        db.refresh(n)
    return [_nota_dict(n) for n in creadas]


@router.post("/api/virginia/notas")
def crear_nota_virginia(data: NotaCreate, db: Session = Depends(get_db)):
    tec, sem = _resolver_virginia(data.nombre, data.semana, db)
    n = NotaVirginia(
        tecnico_virginia_id=tec.id, semana_virginia_id=sem.id, texto=data.texto, orden=data.orden
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _nota_dict(n)


@router.put("/api/virginia/notas/{id}")
def actualizar_nota_virginia(id: int, data: NotaUpdate, db: Session = Depends(get_db)):
    n = db.query(NotaVirginia).filter(NotaVirginia.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    if data.texto is not None:
        n.texto = data.texto
    if data.orden is not None:
        n.orden = data.orden
    db.commit()
    db.refresh(n)
    return _nota_dict(n)


@router.delete("/api/virginia/notas/{id}")
def eliminar_nota_virginia(id: int, db: Session = Depends(get_db)):
    n = db.query(NotaVirginia).filter(NotaVirginia.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(n)
    db.commit()
    return {"message": "Nota eliminada"}
