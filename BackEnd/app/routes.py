from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db import SessionLocal, get_db
from app.controllers import obtener_nombres, validarTecnicoSemana, traerInformacionTecnico,envioRegistrosDB,obtenerCantidadDeCartas,obtenerRegistrosSemana,eliminarRegistros,exporToExcelController
from app.schemmas import TrabajoSchema,TecnicoRequest,SemanaTecnicoSchemaFront,ResumenSemanaSchema
from typing import List


router = APIRouter(
    prefix="/api",
    tags=["home"]  # ← Aquí aplicamos la etiqueta a todas las rutas de este router
)

@router.get("/", response_model=List[str])
async def listar_nombres(db: Session = Depends(get_db)):
    try: 
        data = obtener_nombres(db)

        if data is None:
            raise HTTPException(status_code=404, detail="No hay registros")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/infoTecnico/{nombre}")
async def consultar_tecnico(nombre: str, db: Session = Depends(get_db)):
    try: 
        num, data = traerInformacionTecnico(db, nombre)

        if num == 1:
            raise HTTPException(status_code=404, detail=data)

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validarSemana")
async def validarInformacion(db: Session = Depends(get_db)):
    try: 
        data = validarTecnicoSemana(db)
        if data is None:
            raise HTTPException(status_code=404, detail="No se fue posible validar a {nombre} en la tabla semanal")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/registrosDataBase")
async def envioRegistrosRoute(registros: List[SemanaTecnicoSchemaFront],db: Session = Depends(get_db)):
    try: 
        print(registros)
        data = envioRegistrosDB(registros, db)

        if data is None:
            raise HTTPException(status_code=404, detail="No se fue insertar los registros en la DB")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exportToExcel/{nombre}/{semana}")
async def exporToExcelRoute(registros: List[SemanaTecnicoSchemaFront],nombre:str, semana:str ,db: Session = Depends(get_db)):
    if not registros:
        raise HTTPException(status_code=400, detail="No se enviaron los registros")

    try:
        archivo, nombre = exporToExcelController(registros,nombre,semana,db)
        return StreamingResponse(
            archivo,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={nombre}"
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/informacionGeneralRegistros", response_model=List[ResumenSemanaSchema])
async def informacionCartasRoute(db: Session = Depends(get_db)):
    try: 
        num, data = obtenerCantidadDeCartas(db)

        if num != 0:
            raise HTTPException(status_code=404, detail="No hay informacion para construir las cartas")

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/obtenerRegistros/{nombre}/{semana}")
async def obtenerRegistrosRoute(semana:str, nombre:str, db: Session = Depends(get_db)):
    try: 
        num, data = obtenerRegistrosSemana(semana,nombre,db)
        if num != 0:
            print(nombre)
            raise HTTPException(status_code=404, detail="No se pudo obtener los registros para {nombre}")

        return data
    except HTTPException:  # Atrapa solo HTTPException y la re-lanza tal cual
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/eliminarRegistrosSelecionados")
async def eliminarRegistrosRoute(registros: List[SemanaTecnicoSchemaFront], db: Session = Depends(get_db)):
    try: 
        num, data = eliminarRegistros(registros,db)
        if num != 0:
            raise HTTPException(status_code=404, detail="No se pudo obtener los registros para {nombre}")

        return data
    except HTTPException:  # Atrapa solo HTTPException y la re-lanza tal cual
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))