"""
Rutas del bot (plan del bot, fase 3). `router` va con la llave del chat o la sesión del panel (main.py le pone
`seguridad.ACCESO`); `router_publico` es solo la descarga del Excel por enlace firmado y con vencimiento.
"""

from __future__ import annotations

from datetime import date
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import seguridad, servicio_bot
from app.db import get_db

router = APIRouter(prefix="/api/bot", tags=["bot"], redirect_slashes=False)
router_publico = APIRouter(tags=["bot-publico"], redirect_slashes=False)


class MensajeEntrada(BaseModel):
    texto: str
    wamid: Optional[str] = None
    remitente: Optional[str] = None
    recibido: Optional[Any] = None


class TandaBody(BaseModel):
    semana: str
    mensajes: List[MensajeEntrada]
    tecnico_tanda: Optional[str] = None
    tanda: Optional[str] = None


class TextoBody(BaseModel):
    texto: str


class IdsBody(BaseModel):
    ids: List[int]


class CompletarBody(BaseModel):
    cambios: dict


class NotaBody(BaseModel):
    semana: str
    tecnico: str
    texto: str


class ExcelBody(BaseModel):
    semana: str
    tecnico: Optional[str] = None      # None = todos los de la semana


class SemanaBody(BaseModel):
    semana: str


class TandaIdBody(BaseModel):
    tanda: str


@router.get("/tecnicos")
def tecnicos(db: Session = Depends(get_db)):
    return servicio_bot.nombres_tecnicos(db)


@router.post("/reconoce-tecnico")
def reconoce_tecnico(body: TextoBody, db: Session = Depends(get_db)):
    return servicio_bot.reconoce_tecnico(body.texto, servicio_bot.nombres_tecnicos(db))


@router.get("/semanas")
def semanas(n: int = 8):
    return servicio_bot.opciones_semana(n=min(max(n, 1), 26))


@router.post("/semana")
def semana(body: TextoBody):
    s = servicio_bot.resuelve_semana(body.texto)
    if not s:
        raise HTTPException(status_code=400, detail="No entendí la semana. Escribe «semana 44» o una fecha (3/11).")
    return s


@router.post("/trabajos")
def crear_trabajos(body: TandaBody, db: Session = Depends(get_db)):
    if not body.mensajes:
        raise HTTPException(status_code=400, detail="No llegaron mensajes")
    return servicio_bot.crea_trabajos(db, body.semana, [m.model_dump() for m in body.mensajes],
                                      tecnico_tanda=body.tecnico_tanda, tanda=body.tanda)


class ResolverBody(BaseModel):
    ids: List[int]
    accion: str
    elegido: Optional[int] = None


@router.post("/resolver")
def resolver(body: ResolverBody, db: Session = Depends(get_db)):
    """Se eligió qué hacer con un job repetido: uno, elegido, todos o ninguno."""
    if body.accion not in ("uno", "elegido", "todos", "ninguno"):
        raise HTTPException(status_code=400, detail="Esa opción no existe")
    return servicio_bot.resuelve_grupo(db, body.ids, body.accion, body.elegido)


@router.post("/buscar-tecnico")
def buscar_tecnico(body: TextoBody, db: Session = Depends(get_db)):
    return servicio_bot.busca_tecnico(db, body.texto)


@router.post("/mensajes/{mensaje_id}/completar")
def completar(mensaje_id: int, body: CompletarBody, db: Session = Depends(get_db)):
    r = servicio_bot.completa(db, mensaje_id, body.cambios)
    if r.get("estado") == "no_existe":
        raise HTTPException(status_code=404, detail="Ese mensaje no existe")
    return r


class CorregirBody(BaseModel):
    wamid: str
    texto: str


class RestaurarBody(BaseModel):
    antes: dict


@router.post("/corregir")
def corregir(body: CorregirBody, db: Session = Depends(get_db)):
    """Se citó el mensaje de un trabajo con una corrección. `estado: no_es_trabajo` = no era de un trabajo."""
    return servicio_bot.corrige(db, body.wamid, body.texto)


class CambiarBody(BaseModel):
    texto: str


@router.post("/trabajos/{registro_id}/cambiar")
def cambiar(registro_id: int, body: CambiarBody, db: Session = Depends(get_db)):
    """D-350 · /cambiar <job> y los botones de «¿partes de quién?»: edita el trabajo como está, por su id."""
    return servicio_bot.edita_por_id(db, registro_id, body.texto)


@router.post("/trabajos/{registro_id}/restaurar")
def restaurar(registro_id: int, body: RestaurarBody, db: Session = Depends(get_db)):
    return servicio_bot.restaura(db, registro_id, body.antes)


@router.get("/resumen")
def resumen(semana: str, tecnico: Optional[str] = None, db: Session = Depends(get_db)):
    return servicio_bot.resumen(db, semana, tecnico)


@router.get("/pendientes")
def pendientes(semana: str, db: Session = Depends(get_db)):
    return servicio_bot.pendientes(db, semana)


@router.get("/buscar")
def buscar(job: str, db: Session = Depends(get_db)):
    return servicio_bot.buscar(db, job)


@router.post("/borrar")
def borrar(body: IdsBody, db: Session = Depends(get_db)):
    return {"borrados": servicio_bot.borra(db, body.ids)}


@router.post("/deshacer")
def deshacer(body: TandaIdBody, db: Session = Depends(get_db)):
    return servicio_bot.deshace_tanda(db, body.tanda)


@router.post("/nota")
def nota(body: NotaBody, db: Session = Depends(get_db)):
    r = servicio_bot.agrega_nota(db, body.semana, body.tecnico, body.texto)
    if not r:
        raise HTTPException(status_code=400, detail="No encontré ese técnico o la nota está vacía")
    return r


@router.post("/cerrar-semana")
def cerrar_semana(body: SemanaBody, db: Session = Depends(get_db)):
    return servicio_bot.cierra_semana(db, body.semana)


@router.post("/validar")
def validar(body: IdsBody, db: Session = Depends(get_db)):
    return {"validados": servicio_bot.valida(db, body.ids)}


@router.get("/nuevos")
def nuevos(nombre: str, semana: str, desde: int = 0, db: Session = Depends(get_db)):
    return servicio_bot.nuevos(db, nombre, semana, desde)


@router.get("/gasto-ia")
def gasto_ia(desde: Optional[date] = None, hasta: Optional[date] = None, db: Session = Depends(get_db)):
    return servicio_bot.gasto_ia(db, desde, hasta)


@router.post("/excel-enlaces")
def excel_enlaces(body: ExcelBody, db: Session = Depends(get_db)):
    """Un enlace por técnico (7 días). La ruta es relativa al ERP: el chat le pone delante su dirección."""
    nombres = [body.tecnico] if body.tecnico else servicio_bot.tecnicos_de_semana(db, body.semana)
    if body.tecnico:
        exacto = servicio_bot._nombre_exacto(db, body.tecnico)
        if not exacto:
            raise HTTPException(status_code=404, detail="No encontré ese técnico")
        nombres = [exacto]
    return [{"tecnico": n, "ruta": f"/api/excel/{seguridad.enlace_excel(n, body.semana)}"} for n in nombres]


@router_publico.get("/api/excel/{token}")
def descargar_excel(token: str, db: Session = Depends(get_db)):
    d = seguridad.lee_firma(token)
    if not d or d.get("t") != "excel":
        raise HTTPException(status_code=403, detail="El enlace venció o no es válido. Pide uno nuevo en el chat.")
    r = servicio_bot.excel(db, d["n"], d["s"])
    if not r:
        raise HTTPException(status_code=404, detail="Ese técnico no tiene trabajos en esa semana")
    archivo, nombre = r
    return StreamingResponse(archivo, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


# ── Para los paneles de GAELA (fase 7) ──
@router.get("/semanas-totales")
def semanas_totales(n: int = 12, db: Session = Depends(get_db)):
    return servicio_bot.semanas_con_totales(db, min(max(n, 1), 52))


@router.get("/metricas")
def metricas(n: int = 6, db: Session = Depends(get_db)):
    return servicio_bot.metricas(db, min(max(n, 1), 26))


@router.get("/lectura-ia")
def lectura_ia(n: int = 6, db: Session = Depends(get_db)):
    return servicio_bot.lectura(db, min(max(n, 1), 26))


@router.get("/semana")
def semana_detalle(semana: str, db: Session = Depends(get_db)):
    return servicio_bot.semana_por_tecnico(db, semana)
