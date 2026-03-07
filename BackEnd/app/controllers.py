from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Trabajo, SemanaTecnico,registrosSchemma
from app.utils import semana_actual,obtener_rango_semana
from app.schemmas import TrabajoSchema,TecnicoRequest,SemanaTecnicoSchemaFront,ResumenSemanaSchema
from datetime import date, timedelta
from typing import List
from sqlalchemy import func
import pandas as pd
from io import BytesIO

def obtener_nombres(db: Session):
    resultados = db.query(Trabajo).all()
    if not resultados:
        return None
    list_resultado = sorted([r.nombre for r in resultados])
    return sorted(list(set(list_resultado)))


def validarTecnicoSemana(db:Session):
    label, year, numSenama = semana_actual()
    fecha_inicio, fecha_fin = obtener_rango_semana()
    
    registro = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == label
    ).first()

    if not registro:
        registro = SemanaTecnico(
            year_num=year,
            numero_semana=numSenama,
            semana=label,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
            )
        db.add(registro)
        db.commit()
        db.refresh(registro)

    return registro


def traerInformacionTecnico(db:Session, nombre:str):
    informacionTecnico= db.query(Trabajo).filter(
        Trabajo.nombre == str(nombre).upper()
    ).all()

    if not informacionTecnico:
        return 1, "No se encontro informacion del tecnico {nombre}"

    return 0, informacionTecnico

def envioRegistrosDB(registros: List[SemanaTecnicoSchemaFront], db: Session):
    print(registros)
    if not registros:
        return 400, "No se enviaron registros"
    # Obtener semana actual
    label, year, numSenama = semana_actual()

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == label
    ).first()

    if not semanaDB:
        return 404, "La semana actual no existe en la base de datos"

    try:
        registroDB = [{
            "tecnico_id": registro.id_tecnico,
            "semana_id": semanaDB.id,
            "nombre": registro.nombre,
            "job": registro.job,
            "job_name": registro.job_name,
            "valor_efectivo": registro.valor_efectivo,
            "valor_tarjeta": registro.valor_tarjeta,
            "valor_servicio": registro.valor_servicio,
            "tipo_pago": registro.tipo_pago,
            "partes_gil": registro.partes_gil,
            "minimo": registro.minimo,
            "partes_tecnico": registro.partes_tecnico,
            "tech": registro.tech,
            "porcentaje_tecnico": registro.porcentaje_tecnico,
            "porcentaje_cc": registro.porcentaje_cc,
            "subtotal": registro.subtotal,
            "total": registro.total,
        }
        for registro in registros]

        db.bulk_insert_mappings(registrosSchemma, registroDB)
        db.commit()

        return 0, "Registros agregados correctamente"

    except Exception as e:
        db.rollback()
        return 500, f"Error al insertar registros: {str(e)}"

def obtenerRegistrosSemana(semana:str, db: Session):

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == semana,
    ).first()

    if not semanaDB:
        return 404, "La semana solicitada no existe"

    registrosSemana = db.query(registrosSchemma).filter(
        registrosSchemma.semana_id == semanaDB.id
    ).all()

    if not registrosSemana:
        return 0, "No hay registros para esta semana"

    return 0, registrosSemana

def obtenerRegistrosSemana(semana:str, nombre:str,db: Session):

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == semana,
    ).first()
    if not semanaDB:
        return 404, "La semana solicitada no existe"

    registrosSemana = db.query(registrosSchemma).filter(
        registrosSchemma.semana_id == semanaDB.id,
        registrosSchemma.nombre ==  nombre
    ).all() 
    if not registrosSemana:

        return 404, "No hay registros para esta semana"

    return 0, registrosSemana

def obtenerCantidadDeCartas(db: Session):
    resumen = (
    db.query(
        Trabajo.id.label("tecnico_id"),
        Trabajo.nombre,
        SemanaTecnico.id.label("semana_id"),
        SemanaTecnico.semana,
        func.count(registrosSchemma.id).label("total_registros")
    )
    .join(registrosSchemma, registrosSchemma.tecnico_id == Trabajo.id)
    .join(SemanaTecnico, registrosSchemma.semana_id == SemanaTecnico.id)
    .group_by(
        Trabajo.id,
        SemanaTecnico.id,

    )
    .all())

    if not resumen:
        return 404, "No hay informacion para construir las tablas"
    
    resultado = [ResumenSemanaSchema(
        tecnico_id=row.tecnico_id,
        nombre=row.nombre,
        semana_id=row.semana_id,
        semana=row.semana,
        total_registros=row.total_registros
    ) for row in resumen]

    return 0, resultado
    


def eliminarRegistros(registros:List[SemanaTecnicoSchemaFront], db:Session):
    try:

        ids_registros = [reg.id_registro for reg in registros]
        deleted_count = (
            db.query(registrosSchemma)
            .filter(registrosSchemma.id.in_(ids_registros))
            .delete(synchronize_session=False)
        )

        db.commit()

        return 0, "Registros eliminados correctamente"

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error eliminando registros")

def exporToExcelController(registros:List[SemanaTecnicoSchemaFront],nombre:str,semana:str, db:Session):
    listIDSRegistros = [reg.id_registro for reg in registros]
    registrosDB = (
        db.query(registrosSchemma)
        .filter(registrosSchemma.id.in_(listIDSRegistros))
        .all()
    )
    print(registrosDB)
    if not registrosDB:
        raise Exception("No hay registros")

    dataFrameRegistros = [
        {
        "Nombre": r.nombre,
        "Job": r.job,
        "Job Name": r.job_name,
        "Valor Servicio": r.valor_servicio,
        "Tipo Pago": r.tipo_pago,
        "Partes Gil": r.partes_gil,
        "Partes Tecnico": r.partes_tecnico,
        "Tech": r.tech,
        "Porcentaje Tecnico": r.porcentaje_tecnico,
        "Porcentaje CC": r.porcentaje_cc,
        "Subtotal": r.subtotal,
        "Total": r.total,
        } for r in registrosDB
    ]
    df = pd.DataFrame(dataFrameRegistros)
    output = BytesIO()
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)
    print(df)
    nombre_archivo = f"{nombre}_semana_{semana}.xlsx"
    return output, nombre_archivo