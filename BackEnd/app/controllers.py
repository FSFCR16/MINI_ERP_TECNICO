from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Trabajo, SemanaTecnico,registrosSchemma
from app.utils import semana_actual,obtener_rango_semana, construcionTablaResultado, estilizar_excel
from app.schemmas import TrabajoSchema,TecnicoRequest,SemanaTecnicoSchemaFront,ResumenSemanaSchema,SemanaTecnicoSchema
from datetime import date, timedelta
from typing import List
from sqlalchemy import func
import pandas as pd
from io import BytesIO

def obtener_nombres(db: Session):
    resultados = db.query(Trabajo).all()
    
    list_resultado = sorted([r.nombre for r in resultados])

    return sorted(list(set(list_resultado)))


def validarTecnicoSemana(db: Session):
    label, year, numSemana = semana_actual()
    fecha_inicio, fecha_fin = obtener_rango_semana()

    registro = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == label
    ).first()

    if registro:
        return registro

    registro = SemanaTecnico(
        year_num=year,
        numero_semana=numSemana,
        semana=label,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    db.add(registro)
    db.commit()
    db.refresh(registro)

    return registro


def traerInformacionTecnico(db: Session, nombre: str):

    informacion = db.query(Trabajo).filter(
        Trabajo.nombre == nombre.upper()
    ).all()

    if not informacion:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró información del técnico {nombre}"
        )

    return informacion

def envioRegistrosDB(registros: List[SemanaTecnicoSchemaFront], db: Session):

    if not registros:
        raise HTTPException(
            status_code=400,
            detail="No se enviaron registros"
        )

    label, year, numSemana = semana_actual()

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == label
    ).first()

    if not semanaDB:
        raise HTTPException(
            status_code=404,
            detail="La semana actual no existe en la base de datos"
        )

    try:

        registros_db = [{
            "tecnico_id": r.id_tecnico,
            "semana_id": semanaDB.id,
            "nombre": r.nombre,
            "job": r.job,
            "job_name": r.job_name,
            "valor_efectivo": r.valor_efectivo,
            "valor_tarjeta": r.valor_tarjeta,
            "valor_servicio": r.valor_servicio,
            "tipo_pago": r.tipo_pago,
            "partes_gil": r.partes_gil,
            "minimo": r.minimo,
            "partes_tecnico": r.partes_tecnico,
            "tech": r.tech,
            "porcentaje_tecnico": r.porcentaje_tecnico,
            "porcentaje_cc": r.porcentaje_cc,
            "subtotal": r.subtotal,
            "total": r.total,
        } for r in registros]

        db.bulk_insert_mappings(registrosSchemma, registros_db)
        db.commit()

        return {"message": "Registros agregados correctamente",
                "registros": registros_db}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al insertar registros: {str(e)}"
        )

    except Exception as e:
        db.rollback()
        return 500, f"Error al insertar registros: {str(e)}"

# def obtenerRegistrosSemana(semana:str, db: Session):

#     semanaDB = db.query(SemanaTecnico).filter(
#         SemanaTecnico.semana == semana,
#     ).first()

#     if not semanaDB:
#         return 404, "La semana solicitada no existe"

#     registrosSemana = db.query(registrosSchemma).filter(
#         registrosSchemma.semana_id == semanaDB.id
#     ).all()

#     if not registrosSemana:
#         return 0, "No hay registros para esta semana"

#     return 0, registrosSemana



def obtenerRegistrosSemana(semana: str, nombre: str, db: Session):

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == semana
    ).first()

    if not semanaDB:
        raise HTTPException(
            status_code=404,
            detail="La semana solicitada no existe"
        )

    registros = db.query(registrosSchemma).filter(
        registrosSchemma.semana_id == semanaDB.id,
        registrosSchemma.nombre == nombre
    ).all()

    return registros

    
def obtenerHistorialTenico(nombre:str,db: Session):
    print(nombre)
    resumen = (
        db.query(
            registrosSchemma.nombre,
            SemanaTecnico.semana,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin,
            SemanaTecnico.id.label("semana_id"),
            func.count(registrosSchemma.id).label("total_registros")
        )
        .join(
            SemanaTecnico,
            registrosSchemma.semana_id == SemanaTecnico.id
        )
        .filter(registrosSchemma.nombre == nombre)
        .group_by(
            registrosSchemma.nombre,
            SemanaTecnico.id,
            SemanaTecnico.semana,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin
        )
        .order_by(SemanaTecnico.fecha_inicio.desc())
    )


    return [
        ResumenSemanaSchema(
            nombre=row.nombre,
            semana_id=row.semana_id,
            semana=row.semana,
            fecha_inicio=row.fecha_inicio,
            fecha_fin=row.fecha_fin,
            total_registros=row.total_registros
        )
        for row in resumen
    ]

    
def eliminarRegistros(registros: List[SemanaTecnicoSchemaFront], db: Session):

    try:

        ids = [reg.id_registro for reg in registros]
        print(ids)
        db.query(registrosSchemma).filter(
            registrosSchemma.id.in_(ids)
        ).delete(synchronize_session=False)

        db.commit()

        return {"message": "Registros eliminados correctamente"}

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error eliminando registros"
        )


def exporToExcelController(registros: List[SemanaTecnicoSchemaFront], nombre: str, semana: str, db: Session):

    listIDSRegistros = [reg.id_registro for reg in registros]

    registrosDB = (
        db.query(registrosSchemma)
        .filter(registrosSchemma.id.in_(listIDSRegistros))
        .all()
    )

    if not registrosDB:
        raise HTTPException(
            status_code=404,
            detail="No hay registros para exportar"
        )


    dataFrameRegistros = [
        {
            "Nombre": r.nombre,
            "job": r.job,
            "job Name": r.job_name,
            "valor Servicio": r.valor_servicio,
            "tipo Pago": r.tipo_pago,
            "valor efectivo": r.valor_efectivo,
            "valor tarjeta": r.valor_tarjeta,
            "partes Gil": r.partes_gil,
            "partes Tecnico": r.partes_tecnico,
            "tech": r.tech,
            "porcentaje Tecnico": r.porcentaje_tecnico,
            "porcentaje CC": r.porcentaje_cc,
            "total": r.total,
        }
        for r in registrosDB
    ]

    df = pd.DataFrame(dataFrameRegistros)

    fila_inicio = len(df) + 4

    # -----------------------------
    # Dataframe de resultados
    # -----------------------------

    dfResultado = construcionTablaResultado(df)

    # -----------------------------
    # detectar MIXTO
    # -----------------------------

    hay_mixto = df["TIPO PAGO"].str.upper().eq("MIXTO").any()

    # -----------------------------
    # renombrar columnas
    # -----------------------------

    df_export = df.rename(columns={
        "NOMBRE": "NAME",
        "JOB": "JOB",
        "JOB NAME": "ID JOB",
        "VALOR SERVICIO": "SALES",
        "TIPO PAGO": "PAYMENT TYPE",
        "VALOR EFECTIVO": "CASH",
        "VALOR TARJETA": "CC",
        "PARTES GIL": "GIL PARTS",
        "PARTES TECNICO": "TECH PARTS",
        "TECH": "TECH",
        "PORCENTAJE TECNICO": "%",
        "PORCENTAJE CC": "4%CC",
        "TOTAL": "TOTAL"
    })

    columnas = [
        "NAME",
        "ID JOB",
        "%",
        "PAYMENT TYPE",
        "SALES",
        "4%CC",
        "GIL PARTS",
        "TECH PARTS",
        "TECH",
        "TOTAL"
    ]

    if hay_mixto:
        columnas.insert(4, "CASH")
        columnas.insert(5, "CC")

    df_export = df_export[columnas]

    # -----------------------------
    # tabla BALANCED TECH
    # -----------------------------

    balanced_tech = df_export["TOTAL"].sum()

    df_balance = pd.DataFrame({
        "BALANCED TECH": [balanced_tech]
    })

    # -----------------------------
    # crear excel
    # -----------------------------

    output = BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:

        df_export.to_excel(writer, index=False)

        dfResultado.to_excel(writer, startrow=fila_inicio, index=False)

        df_balance.to_excel(
            writer,
            startrow=fila_inicio,
            startcol=8,
            index=False
        )

    output = estilizar_excel(output, df_export, dfResultado, fila_inicio) 
    output.seek(0) 
    nombre_archivo = f"{nombre}_semana_{semana}.xlsx" 
    return output, nombre_archivo

