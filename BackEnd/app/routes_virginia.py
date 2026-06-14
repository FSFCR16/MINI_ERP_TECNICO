"""
Rutas del módulo VIRGINIA — prefijo /api/virginia. Independiente del router general.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.controllers_virginia import (
    # técnicos
    listarTecnicosVirginia, crearTecnicoVirginia, actualizarTecnicoVirginia,
    eliminarTecnicoVirginia, obtenerNombresVirginia, infoTecnicoVirginia,
    # config
    listarConfigVirginia, crearConfigVirginia, actualizarConfigVirginia, eliminarConfigVirginia,
    # métodos de pago
    listarMetodosPago, crearMetodoPago, actualizarMetodoPago, eliminarMetodoPago,
    # semanas
    validarSemanaVirginia, obtenerSemanasVirginia, obtenerTecnicosPorSemanaVirginia,
    eliminarSemanaVirginia, historialTecnicoVirginia, historialTodosVirginia,
    eliminarTecnicoSemanaVirginia, semanasRecientesVirginia, validarJobDuplicadoVirginia,
    # registros
    envioRegistrosVirginia, obtenerRegistrosSemanaVirginia, actualizarRegistroVirginia,
    bulkUpdateRegistrosVirginia, eliminarRegistrosVirginia,
    # partes
    agregarParteVirginia, listarPartesVirginia, eliminarParteVirginia,
    # export
    exportarExcelVirginia,
    # parser IA
    parse_ticket_virginia,
)
from app.schemmas_virginia import (
    TecnicoVirginiaCreate, TecnicoVirginiaUpdate,
    ConfigVirginiaCreate, ConfigVirginiaUpdate,
    MetodoPagoVirginiaCreate, MetodoPagoVirginiaUpdate,
    SemanaVirginiaBody, SemanaVirginiaRequest, EliminarTecnicoVirginiaRequest,
    EnvioRegistrosVirginiaBody, UpdateRegistroVirginiaSchema,
    ParteVirginiaCreate,
)

router = APIRouter(
    prefix="/api/virginia",
    tags=["virginia"],
    redirect_slashes=False,
)


# ── TÉCNICOS (persona) ──────────────────────────
@router.get("/tecnicos")
async def getTecnicos(db: Session = Depends(get_db)):
    return listarTecnicosVirginia(db)


@router.get("/nombres", response_model=List[str])
async def getNombres(db: Session = Depends(get_db)):
    return obtenerNombresVirginia(db)


@router.get("/infoTecnico/{nombre}")
async def getInfoTecnico(nombre: str, db: Session = Depends(get_db)):
    return infoTecnicoVirginia(nombre, db)


@router.post("/tecnicos")
async def postTecnico(data: TecnicoVirginiaCreate, db: Session = Depends(get_db)):
    return crearTecnicoVirginia(data, db)


@router.put("/tecnicos/{id}")
async def putTecnico(id: int, data: TecnicoVirginiaUpdate, db: Session = Depends(get_db)):
    return actualizarTecnicoVirginia(id, data, db)


@router.delete("/tecnicos/{id}")
async def deleteTecnico(id: int, db: Session = Depends(get_db)):
    return eliminarTecnicoVirginia(id, db)


# ── CONFIG por job ──────────────────────────────
@router.get("/config/{tecnico_id}")
async def getConfig(tecnico_id: int, db: Session = Depends(get_db)):
    return listarConfigVirginia(tecnico_id, db)


@router.post("/config")
async def postConfig(data: ConfigVirginiaCreate, db: Session = Depends(get_db)):
    return crearConfigVirginia(data, db)


@router.put("/config/{id}")
async def putConfig(id: int, data: ConfigVirginiaUpdate, db: Session = Depends(get_db)):
    return actualizarConfigVirginia(id, data, db)


@router.delete("/config/{id}")
async def deleteConfig(id: int, db: Session = Depends(get_db)):
    return eliminarConfigVirginia(id, db)


# ── MÉTODOS DE PAGO ─────────────────────────────
@router.get("/metodos-pago/{tecnico_id}")
async def getMetodos(tecnico_id: int, db: Session = Depends(get_db)):
    return listarMetodosPago(tecnico_id, db)


@router.post("/metodos-pago")
async def postMetodo(data: MetodoPagoVirginiaCreate, db: Session = Depends(get_db)):
    return crearMetodoPago(data, db)


@router.put("/metodos-pago/{id}")
async def putMetodo(id: int, data: MetodoPagoVirginiaUpdate, db: Session = Depends(get_db)):
    return actualizarMetodoPago(id, data, db)


@router.delete("/metodos-pago/{id}")
async def deleteMetodo(id: int, db: Session = Depends(get_db)):
    return eliminarMetodoPago(id, db)


# ── SEMANAS ─────────────────────────────────────
@router.post("/validarSemana")
async def postValidarSemana(body: SemanaVirginiaBody, db: Session = Depends(get_db)):
    return validarSemanaVirginia(db, body.semana)


@router.get("/historial-semanas")
async def getHistorialSemanas(db: Session = Depends(get_db)):
    return obtenerSemanasVirginia(db)


@router.get("/semanas-recientes")
async def getSemanasRecientes(n: int = 8):
    return semanasRecientesVirginia(n)


@router.get("/validar-job/{job_name}")
async def getValidarJob(job_name: str, db: Session = Depends(get_db)):
    return validarJobDuplicadoVirginia(job_name, db)


@router.post("/historial-semana-tecnicos")
async def postSemanaTecnicos(body: SemanaVirginiaRequest, db: Session = Depends(get_db)):
    return obtenerTecnicosPorSemanaVirginia(body.semana_id, db)


@router.delete("/delete-historial-semana")
async def deleteSemana(data: SemanaVirginiaRequest, db: Session = Depends(get_db)):
    return eliminarSemanaVirginia(data.semana_id, db)


@router.get("/historial-tecnico/{nombre}")
async def getHistorialTecnico(nombre: str, db: Session = Depends(get_db)):
    return historialTecnicoVirginia(nombre, db)


@router.get("/historial-todos")
async def getHistorialTodos(db: Session = Depends(get_db)):
    return historialTodosVirginia(db)


@router.delete("/delete-historial-tecnico")
async def deleteTecnicoSemana(data: EliminarTecnicoVirginiaRequest, db: Session = Depends(get_db)):
    return eliminarTecnicoSemanaVirginia(data.nombre, data.semana_id, db)


# ── REGISTROS ───────────────────────────────────
@router.post("/registrosDataBase")
async def postRegistros(body: EnvioRegistrosVirginiaBody, db: Session = Depends(get_db)):
    return envioRegistrosVirginia(body.registros, db, body.semana)


@router.get("/obtenerRegistros/{nombre}/{semana}")
async def getRegistros(nombre: str, semana: str, db: Session = Depends(get_db)):
    return obtenerRegistrosSemanaVirginia(nombre, semana, db)


@router.put("/update-registro/{id}")
async def putRegistro(id: int, data: UpdateRegistroVirginiaSchema, db: Session = Depends(get_db)):
    return actualizarRegistroVirginia(id, data, db)


@router.put("/bulk-update-registros")
async def putBulkRegistros(registros: List[UpdateRegistroVirginiaSchema], db: Session = Depends(get_db)):
    return bulkUpdateRegistrosVirginia(registros, db)


@router.delete("/eliminarRegistros")
async def deleteRegistros(ids: List[int], db: Session = Depends(get_db)):
    return eliminarRegistrosVirginia(ids, db)


# ── PARTES ──────────────────────────────────────
@router.post("/partes")
async def postParte(data: ParteVirginiaCreate, db: Session = Depends(get_db)):
    return agregarParteVirginia(data, db)


@router.get("/partes/{tecnico_id}/{semana}")
async def getPartes(tecnico_id: int, semana: str, db: Session = Depends(get_db)):
    return listarPartesVirginia(tecnico_id, semana, db)


@router.delete("/partes/{id}")
async def deleteParte(id: int, db: Session = Depends(get_db)):
    return eliminarParteVirginia(id, db)


# ── EXPORT EXCEL ────────────────────────────────
@router.post("/exportToExcel/{nombre}/{semana}")
async def postExportExcel(
    nombre: str, semana: str, registro_ids: List[int], db: Session = Depends(get_db)
):
    if not registro_ids:
        raise HTTPException(status_code=400, detail="No se enviaron registros")
    archivo, nombre_archivo = exportarExcelVirginia(registro_ids, nombre, semana, db)
    return StreamingResponse(
        archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )


# ── PARSER IA ───────────────────────────────────
@router.post("/parsear-mensaje")
async def postParsearMensaje(body: dict):
    return parse_ticket_virginia(
        body.get("mensaje", ""),
        body.get("metodos", []),
        body.get("nombre"),
    )
