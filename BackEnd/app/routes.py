from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db import SessionLocal, get_db
from app.controllers import obtener_nombres, validarTecnicoSemana, traerInformacionTecnico, envioRegistrosDB, obtenerHistorialTenico, obtenerRegistrosSemana, eliminarRegistros, exporToExcelController,obtenerSemanasDisponibles,obtenerTecnicosPorSemana, eliminarSemana, eliminarTecnicoSemana
from app.schemmas import TrabajoSchema, TecnicoRequest, SemanaTecnicoSchemaFront, ResumenSemanaSchema,SemanaRequest,infoSemana
from typing import List


router = APIRouter(
    prefix="/api",
    tags=["home"]
)


@router.get("/", response_model=List[str])
async def listar_nombres(db: Session = Depends(get_db)):
    return obtener_nombres(db)


@router.get("/version")
def version():
    return {"version": "backend actualizado 1"}


@router.get("/infoTecnico/{nombre}")
async def consultar_tecnico(nombre: str, db: Session = Depends(get_db)):
    return traerInformacionTecnico(db, nombre)


@router.post("/validarSemana")
async def validarInformacion(db: Session = Depends(get_db)):
    return validarTecnicoSemana(db)


@router.post("/registrosDataBase")
async def envioRegistrosRoute(registros: List[SemanaTecnicoSchemaFront], db: Session = Depends(get_db)):
    return envioRegistrosDB(registros, db)

@router.get("/historial-semanas")
async def obtenerSemanasRoute(db: Session = Depends(get_db)):
    return obtenerSemanasDisponibles(db)

@router.post("/historial-semana-tecnicos")
async def historialSemanaTecnicosRoute(
    semana: SemanaRequest,
    db: Session = Depends(get_db)
):
    return obtenerTecnicosPorSemana(semana.semana_id, db)

@router.post("/historial-tecnico")
def obtenerHistorialTenicoRoute(nombre: TecnicoRequest, db: Session = Depends(get_db)):
    return obtenerHistorialTenico(nombre.nombre, db)

@router.post("/exportToExcel/{nombre}/{semana}")
async def exporToExcelRoute(registros: List[SemanaTecnicoSchemaFront], nombre: str, semana: str, db: Session = Depends(get_db)):

    if not registros:
        raise HTTPException(status_code=400, detail="No se enviaron los registros")

    archivo, nombre_archivo = exporToExcelController(registros, nombre, semana, db)

    return StreamingResponse(
        archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={nombre_archivo}"
        },
    )


# @router.get("/informacionGeneralRegistros", response_model=List[ResumenSemanaSchema])
# async def informacionCartasRoute(db: Session = Depends(get_db)):
#     return obtenerCantidadDeCartas(db)


@router.get("/obtenerRegistros/{nombre}/{semana}")
async def obtenerRegistrosRoute(semana: str, nombre: str, db: Session = Depends(get_db)):
    return obtenerRegistrosSemana(semana, nombre, db)


@router.delete("/eliminarRegistrosSelecionados")
async def eliminarRegistrosRoute(registros: List[SemanaTecnicoSchemaFront], db: Session = Depends(get_db)):
    return eliminarRegistros(registros, db)

@router.delete("/delete-historial-semana")
async def eliminarSemanaRoute(data: SemanaRequest, db: Session = Depends(get_db)):
    print(data)
    return eliminarSemana(data.semana_id, db)


@router.delete("/delete-historial-tecnico")
async def eliminarTecnicoSemanaRoute(data: infoSemana, db: Session = Depends(get_db)):
    return eliminarTecnicoSemana(data, db)