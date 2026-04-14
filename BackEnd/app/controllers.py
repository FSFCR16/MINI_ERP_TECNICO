from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Trabajo, SemanaTecnico,registrosSchemma
from app.utils import semana_actual,obtener_rango_semana, construcionTablaResultado, estilizar_excel
from app.schemmas import TrabajoSchema,TecnicoRequest,SemanaTecnicoSchemaFront,ResumenSemanaSchema,SemanaTecnicoSchema
from datetime import date, timedelta
from typing import List
from sqlalchemy import func, desc
import pandas as pd
from io import BytesIO
import re
import json
import os
from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.exc import IntegrityError

def obtener_nombres(db: Session):
    resultados = db.query(Trabajo).all()
    
    list_resultado = sorted([r.nombre for r in resultados])

    return sorted(list(set(list_resultado)))


def validarTecnicoSemana(db: Session, semana_label: str = None):
    label_actual, year, numSemana = semana_actual()
    fecha_inicio, fecha_fin = obtener_rango_semana()
    print(f"semana_label: {semana_label}")
    print(f"label_actual: {label_actual}")
    # 🔹 CASO 1: Viene label
    if semana_label:
        registro = db.query(SemanaTecnico).filter(
            SemanaTecnico.semana == semana_label
        ).first()

        if registro:
            return registro

        if semana_label != label_actual:
            raise HTTPException(status_code=404, detail="Semana no encontrada")

        # ↓ SOLO ESTO CAMBIA
        try:
            registro = SemanaTecnico(
                year_num=year, numero_semana=numSemana, semana=label_actual,
                fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
            )
            db.add(registro)
            db.commit()
            db.refresh(registro)
            return registro
        except IntegrityError:
            db.rollback()
            return db.query(SemanaTecnico).filter(SemanaTecnico.semana == label_actual).first()

    # 🔹 CASO 2: NO viene label
    registro = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == label_actual
    ).first()

    if registro:
        return registro

    # ↓ SOLO ESTO CAMBIA
    try:
        registro = SemanaTecnico(
            year_num=year, numero_semana=numSemana, semana=label_actual,
            fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro
    except IntegrityError:
        db.rollback()
        return db.query(SemanaTecnico).filter(SemanaTecnico.semana == label_actual).first()

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

def envioRegistrosDB(registros: List[SemanaTecnicoSchemaFront], db: Session, semana: str):
    if not registros:
        raise HTTPException(status_code=400, detail="No se enviaron registros")

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == semana
    ).first()

    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")

    try:
        registros_creados = []
        for r in registros:
            nuevo = registrosSchemma(
                tecnico_id=r.id_tecnico,
                semana_id=semanaDB.id,
                nombre=r.nombre,
                job=r.job,
                job_name=r.job_name,
                valor_efectivo=r.valor_efectivo,
                valor_tarjeta=r.valor_tarjeta,
                valor_servicio=r.valor_servicio,
                tipo_pago=r.tipo_pago,
                partes_gil=r.partes_gil,
                partes_tecnico=r.partes_tecnico,
                tech=r.tech,
                porcentaje_tecnico=r.porcentaje_tecnico,
                porcentaje_cc=r.porcentaje_cc,
                subtotal=r.subtotal,
                total=r.total,
            )
            db.add(nuevo)
            db.flush()
            registros_creados.append({"id": nuevo.id, "job": nuevo.job})

        db.commit()
        return {"message": "Registros agregados correctamente", "registros": registros_creados}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al insertar registros: {str(e)}")

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
    ).order_by(registrosSchemma.created_at.asc()).all()

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

def obtenerSemanasDisponibles(db: Session):

    semanas = (
        db.query(SemanaTecnico)
        .order_by(desc(SemanaTecnico.fecha_inicio))
        .all()
    )

    return semanas

from sqlalchemy import func

def obtenerTecnicosPorSemana(semana_id: int, db: Session):

    resumen = (
        db.query(
            func.max(registrosSchemma.id).label("id"),
            registrosSchemma.nombre,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin,
            SemanaTecnico.semana,
            SemanaTecnico.id.label("semana_id"),
            func.sum(registrosSchemma.total).label("total_generado"),
            func.count(registrosSchemma.nombre).label("total_registros")
        )
        .join(
            SemanaTecnico,
            registrosSchemma.semana_id == SemanaTecnico.id
        )
        .filter(
            registrosSchemma.semana_id == semana_id
        )
        .group_by(
            registrosSchemma.nombre,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin,
            SemanaTecnico.semana,
            SemanaTecnico.id
        )
        .order_by(
            registrosSchemma.nombre.asc()
        )
        .all()
    )

    return [
        {
            "id": row.id,
            "nombre": row.nombre,
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin": row.fecha_fin,
            "semana": row.semana,
            "semana_id": row.semana_id,
            "total": row.total_generado,
            "total_registros": row.total_registros
        }
        for row in resumen
    ]

def eliminarSemana(semana_id: int, db: Session):

    semana = db.query(SemanaTecnico).filter(
        SemanaTecnico.id == semana_id
    ).first()

    db.delete(semana)

    db.commit()

    return {"message": "Semana eliminada correctamente"}

def eliminarTecnicoSemana(data, db: Session):

    db.query(registrosSchemma).filter(
        registrosSchemma.nombre == data.nombre,
        registrosSchemma.semana_id == data.semana_id
    ).delete(synchronize_session=False)

    db.commit()

    return {"message": "Registros del técnico eliminados correctamente"}


APIKEY = os.getenv("API_KEY_CHAT")
client = OpenAI(api_key=APIKEY)
# ══════════════════════════════════════════════════════════════
#  PROMPT
# ══════════════════════════════════════════════════════════════
SYSTEM_PROMPT = """
Eres un extractor de datos de tickets de servicio de cerrajería.
Devuelve SOLO un JSON válido. Sin texto extra, sin markdown, sin explicaciones.

━━━ REGLAS GENERALES ━━━
- Si un campo no está claro en el mensaje → null
- NUNCA inventes datos
- NUNCA combines datos de campos distintos

━━━ REGLAS DE DINERO ━━━

Un número ES dinero relevante SOLO si cumple alguna de estas condiciones:
1. Está acompañado de contexto de cash (cash, efectivo)
2. Está acompañado de contexto de crédito (cc, card, credit, scanpay, zelle)
3. Está acompañado de contexto de partes (parts, ccf, parts gil, p)
4. Por el contexto del mensaje parece ser el valor final del servicio

Si un número NO cumple ninguna — ignorarlo completamente.

PARTES (NO son el valor del servicio, nunca se suman):
- "20$ parts Afik" → parts_tecnico=20, parts_tecnico_nombre="Afik"
- "50$ parts"      → parts_tecnico=50, parts_tecnico_nombre=null
- "10p" o "50p" o "$50p" → parts_tecnico=ese número, es la letra p pegada al número
- "parts gil"      → parts_gil=ese valor
- "10$ ccf"        → parts_gil=10

TIPO DE PAGO — solo 3 valores posibles: "CASH", "CC", "MIXTO":
- Variantes de CASH: cash, efectivo
- Variantes de CC: cc, credit, credit card, scanpay, card, zelle, paid to (nombre)
- Si aparecen CASH y CC en el mismo mensaje → "MIXTO"
- Si NO hay ninguna variante de pago en el mensaje → asumir "CASH" por defecto
- SIEMPRE devolver uno de: "CASH", "CC", "MIXTO" — nunca null, nunca otro valor

JOB TYPE — solo 2 valores posibles: "CAR KEY", "LOCKOUT":
- Variantes de CAR KEY: car key, car key made, key made, key program, key programming
- Variantes de LOCKOUT: lockout, car lockout, lock out, locked out, lock change, lock
- Si no hay ninguna variante clara → null
- SIEMPRE devolver uno de: "CAR KEY", "LOCKOUT", null — nunca otro valor

VALOR DEL SERVICIO (valor_servicio):
- Si hay cash + cc → el total ya aparece explícito en el mensaje, ese es valor_servicio
- Si hay solo cash → valor_servicio = ese monto
- Si hay solo cc   → valor_servicio = ese monto
- Si aparece UN SOLO número en el mensaje sin contexto de pago explícito → ese ES el valor_servicio, asumir CASH
- Si hay un número solo que por contexto parece el total → valor_servicio = ese número
- NUNCA sumes partes al valor_servicio
- Si no puedes determinarlo → null

VALOR EN EFECTIVO (valor_efectivo):
- El monto específico pagado en cash
- Solo si aparece explícito → si no, null

VALOR CON TARJETA (valor_tarjeta):
- El monto específico pagado con tarjeta/cc/scanpay/zelle
- Solo si aparece explícito → si no, null

━━━ CAMPOS A EXTRAER ━━━

{
  "company":               "nombre de la empresa | null",
  "job_name":              "código o número del ticket (ej: TLER-BCPS, AKBZH7, 5PVLF) | null",
  "nombre":                "nombre del cliente | null",
  "job_type":              "CAR KEY | LOCKOUT | null",
  "date":                  "fecha como aparezca en el mensaje | null",
  "time":                  "hora como aparezca en el mensaje | null",
  "address":               "dirección completa | null",
  "phone":                 "teléfono principal del cliente | null",
  "valor_servicio":        número o 0,
  "valor_efectivo":        número o 0,
  "valor_tarjeta":         número o 0,
  "tipo_pago":             "CASH | CC | MIXTO",
  "parts_tecnico":         número o 0,
  "parts_tecnico_nombre":  "nombre del técnico | 0",
  "parts_gil":             número o 0
}
"""
 
 
# ══════════════════════════════════════════════════════════════
#  FUNCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════
 
def parse_ticket(text: str) -> dict:
    """
    Le pasa el mensaje a la IA y devuelve el JSON limpio.
    Los campos que la IA no pueda identificar vienen en null —
    es tu código el que decide qué hacer con esos nulls.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,        # Sin creatividad — solo extracción
            max_tokens=600,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": text}
            ]
        )
 
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)

        # Agregar lista de campos faltantes al resultado
        faltantes = [f for f in ["job_type", "tipo_pago"] if not result.get(f)]
        result["faltantes"] = faltantes
        print(result)
        return result

 
    except json.JSONDecodeError:
        print(f"[ERROR] La IA no devolvió JSON válido:\n{raw}")
        return {}
    except Exception as e:
        print(f"[ERROR] Fallo en la API: {e}")
        return {}
 
 
def updateRegistroController(id: int, data, db: Session):

    registro = db.query(registrosSchemma).filter(
        registrosSchemma.id == id
    ).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    try:
        for key, value in data.dict(exclude_unset=True).items():
            setattr(registro, key, value)

        db.commit()
        db.refresh(registro)

        return {"message": "Registro actualizado correctamente"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error actualizando registro: {str(e)}"
        )

# 🔹 OBTENER TODOS
def obtenerTrabajos(db: Session):
    return db.query(Trabajo).all()

# 🔹 CREAR
def crearTrabajo(data, db: Session):
    try:
        datos = data.dict()
        datos["nombre"] = datos["nombre"].strip().upper()
        datos["porcentaje_gil"] = round(100 - datos["porcentaje_tecnico"], 2)
        nuevo = Trabajo(**datos)
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
# 🔹 ACTUALIZAR
def actualizarTrabajo(id: int, data, db: Session):
    trabajo = db.query(Trabajo).filter(Trabajo.id == id).first()

    if not trabajo:
        raise HTTPException(404, "Trabajo no encontrado")

    try:
        for key, value in data.dict(exclude_unset=True).items():
            setattr(trabajo, key, value)

        db.commit()
        db.refresh(trabajo)
        return {"message": "Actualizado correctamente"}

    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))

# 🔹 ELIMINAR
def eliminarTrabajo(id: int, db: Session):
    trabajo = db.query(Trabajo).filter(Trabajo.id == id).first()

    if not trabajo:
        raise HTTPException(404, "Trabajo no encontrado")

    db.delete(trabajo)
    db.commit()

    return {"message": "Eliminado correctamente"}