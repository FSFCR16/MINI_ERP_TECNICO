from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db import SessionLocal, get_db
from app.controllers import bulkUpdateRegistros,validarJobDuplicado,eliminarTrabajo, obtenerTrabajos,crearTrabajo,actualizarTrabajo,eliminarTrabajo,obtener_nombres,updateRegistroController, validarTecnicoSemana, traerInformacionTecnico, envioRegistrosDB, obtenerHistorialTenico, obtenerRegistrosSemana, eliminarRegistros, exporToExcelController,obtenerSemanasDisponibles,obtenerTecnicosPorSemana, eliminarSemana, eliminarTecnicoSemana,parse_ticket
from app.schemmas import TrabajoCreateSchema,TrabajoSchema,UpdateRegistroSchema, TecnicoRequest, SemanaTecnicoSchemaFront, ResumenSemanaSchema,SemanaRequest,infoSemana,EnvioRegistrosBody, SemanaBody
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
async def validarInformacion(body: SemanaBody, db: Session = Depends(get_db)):
    return validarTecnicoSemana(db, body.semana)

@router.post("/parsear-mensaje")
async def parsearMensaje(body: dict):
    resultado = parse_ticket(body["mensaje"])
    return resultado

# @router.post("/registrosDataBase")
# async def envioRegistrosRoute(registros: List[SemanaTecnicoSchemaFront], db: Session = Depends(get_db)):
#     return envioRegistrosDB(registros, db)

@router.post("/registrosDataBase")
async def envioRegistrosRoute(body: EnvioRegistrosBody, db: Session = Depends(get_db)):
    return envioRegistrosDB(body.registros, db, body.semana)

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


@router.put("/update-registro/{id}")
async def updateRegistroRoute(
    id: int,
    data: UpdateRegistroSchema,
    db: Session = Depends(get_db)
):
    return updateRegistroController(id, data, db)

@router.get("/trabajos")
async def getTrabajos(db: Session = Depends(get_db)):
    return obtenerTrabajos(db)

@router.post("/trabajos")
async def postTrabajo(
    data: TrabajoCreateSchema,
    db: Session = Depends(get_db)
):
    return crearTrabajo(data, db)

@router.put("/trabajos/{id}")
async def putTrabajo(
    id: int,
    data: TrabajoCreateSchema,
    db: Session = Depends(get_db)
):
    return actualizarTrabajo(id, data, db)

@router.delete("/trabajos/{id}")
async def deleteTrabajo(
    id: int,
    db: Session = Depends(get_db)
):
    return eliminarTrabajo(id, db)

@router.get("/validar-job/{job_name}")
def validarJobRoute(job_name: str, db: Session = Depends(get_db)):
    return validarJobDuplicado(job_name, db)

@router.put("/bulk-update-registros")
async def bulkUpdateRegistrosRoute(
    registros: List[UpdateRegistroSchema],
    db: Session = Depends(get_db)
):
    return bulkUpdateRegistros(registros, db)