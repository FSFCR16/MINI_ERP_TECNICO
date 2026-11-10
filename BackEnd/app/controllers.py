from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import Trabajo, SemanaTecnico,registrosSchemma
from app import servicio_calculo
from app.utils import semana_actual,obtener_rango_semana, construcionTablaResultado, estilizar_excel, datos_semana_desde_label, semanas_recientes
from app.schemmas import TrabajoSchema,TecnicoRequest,UpdateRegistroSchema,SemanaTecnicoSchemaFront,ResumenSemanaSchema,SemanaTecnicoSchema
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
from fastapi.encoders import jsonable_encoder
from app import lector, lectura_ia
from app.models_bot import MensajeBot
from sqlalchemy.exc import IntegrityError

def obtener_nombres(db: Session):
    resultados = db.query(Trabajo).all()
    
    list_resultado = sorted([r.nombre for r in resultados])

    return sorted(list(set(list_resultado)))


def validarTecnicoSemana(db: Session, semana_label: str = None):
    label_actual, year, numSemana = semana_actual()
    fecha_inicio, fecha_fin = obtener_rango_semana()

    objetivo = semana_label or label_actual

    # Si ya existe, se devuelve
    registro = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == objetivo
    ).first()
    if registro:
        return registro

    # 🔹 Crear la semana ACTUAL
    if objetivo == label_actual:
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

    # 🔹 Crear una semana ANTERIOR a la actual (solo pasadas)
    datos = datos_semana_desde_label(objetivo)
    if not datos:
        raise HTTPException(status_code=400, detail="Etiqueta de semana inválida")
    _, anio_l, num_l, ini_l, fin_l = datos
    if ini_l >= fecha_inicio:
        raise HTTPException(status_code=400, detail="Solo se pueden crear semanas anteriores a la actual")
    try:
        registro = SemanaTecnico(
            year_num=anio_l, numero_semana=num_l, semana=objetivo,
            fecha_inicio=ini_l, fecha_fin=fin_l
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro
    except IntegrityError:
        db.rollback()
        return db.query(SemanaTecnico).filter(SemanaTecnico.semana == objetivo).first()


def semanasRecientesController(n: int = 8):
    return semanas_recientes(n)

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

def _con_lectura(db: Session, regs: list) -> list[dict]:
    """Lo que el panel recibe de cada fila guardada, con su `lectura` (el puntico: lo que la IA leyó distinto)."""
    lecturas = lectura_ia.por_trabajo(db, regs)
    return [{**servicio_calculo.fila_respuesta(r), "lectura": lecturas.get(r.id)} for r in regs]


def _mensaje_del_panel(db: Session, mensaje_id: int | None) -> int | None:
    """El mensaje pegado en el panel del que salió la fila, si existe y todavía no tiene trabajo."""
    if not mensaje_id:
        return None
    m = db.get(MensajeBot, mensaje_id)
    return m.id if m and m.remitente == "panel" and not m.registro_id else None


def lee_del_panel(db: Session, texto: str) -> dict:
    """«Pegar mensaje» del panel: lo lee la IA (como el bot) y lo GUARDA con lo que leyó, para saber después si lo
    leyó bien (`lectura_ia`). El gasto entra en «Gasto de IA» igual que el del bot."""
    from app.servicio_bot import costo                     # import aquí: servicio_bot importa este módulo
    resultado, uso = parse_ticket_con_uso(texto)
    m = MensajeBot(remitente="panel", texto=texto, estado="panel", salida_ia=json.dumps(resultado, ensure_ascii=False),
                   modelo=uso.get("modelo"), version_prompt=uso.get("version_prompt"),
                   tokens_entrada=uso.get("tokens_entrada"), tokens_salida=uso.get("tokens_salida"), costo_usd=costo(uso))
    db.add(m)
    db.commit()
    return {**resultado, "mensaje_id": m.id} if resultado else resultado


def envioRegistrosDB(registros: List[SemanaTecnicoSchemaFront], db: Session, semana: str):
    if not registros:
        raise HTTPException(status_code=400, detail="No se enviaron registros")

    semanaDB = db.query(SemanaTecnico).filter(
        SemanaTecnico.semana == semana
    ).first()

    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")

    try:
        creados = []
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
                # Plan del bot, fase 2: lo que la fórmula usa (sin él, del contrato) y de dónde vino
                is_cash=r.is_cash, aplica_dolar_empresa=r.aplica_dolar_empresa, adicional_dolar=r.adicional_dolar,
                minimo=r.minimo, dolar_adicional_empresa=r.dolar_adicional_empresa, origen="panel",
                mensaje_id=_mensaje_del_panel(db, r.mensaje_id),
            )
            db.add(nuevo)
            db.flush()
            if nuevo.mensaje_id:
                db.get(MensajeBot, nuevo.mensaje_id).registro_id = nuevo.id
            # El servidor manda: recalcula con la misma fórmula del panel (anota si no coincide).
            servicio_calculo.recalcula(db, nuevo, r.total)
            creados.append(nuevo)

        respuesta = _con_lectura(db, creados)
        db.commit()
        return {"message": "Registros agregados correctamente", "registros": respuesta}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al insertar registros: {str(e)}")

def obtenerRegistrosSemana( nombre: str, semana: str, db: Session):

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

    lecturas = lectura_ia.por_trabajo(db, registros)       # el puntico de la tabla: lo que la IA leyó distinto
    return [{**jsonable_encoder(r), "lectura": lecturas.get(r.id)} for r in registros]

    
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


def historialTodos(db: Session):
    """Todos los técnicos-semana del general (para el dashboard unificado)."""
    resumen = (
        db.query(
            registrosSchemma.nombre,
            SemanaTecnico.semana,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin,
            SemanaTecnico.id.label("semana_id"),
            func.sum(registrosSchemma.total).label("total"),
            func.count(registrosSchemma.id).label("total_registros"),
        )
        .join(SemanaTecnico, registrosSchemma.semana_id == SemanaTecnico.id)
        .group_by(
            registrosSchemma.nombre,
            SemanaTecnico.id,
            SemanaTecnico.semana,
            SemanaTecnico.fecha_inicio,
            SemanaTecnico.fecha_fin,
        )
        .order_by(SemanaTecnico.fecha_inicio.desc(), registrosSchemma.nombre.asc())
        .all()
    )
    return [
        {
            "nombre": row.nombre,
            "semana_id": row.semana_id,
            "semana": row.semana,
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin": row.fecha_fin,
            "total": row.total,
            "total_registros": row.total_registros,
        }
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
        .order_by(registrosSchemma.created_at.asc())
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
    # crear excel
    # -----------------------------

    output = BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:

        df_export.to_excel(writer, index=False)

        dfResultado.to_excel(writer, startrow=fila_inicio, index=False)


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
#  PROMPT: vive en app/lector.py, ordenado por secciones
# ══════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════
 
MODELO_LECTOR = "gpt-6-luna"
VERSION_PROMPT = "2026-11-09"     # súbela cuando cambie el prompt de app/lector.py: el historial del bot compara versiones


def parse_ticket_con_uso(text: str) -> tuple[dict, dict]:
    """Como `parse_ticket`, y además devuelve el gasto de la llamada (plan del bot, §9):
    {"modelo", "version_prompt", "tokens_entrada", "tokens_salida"}. Si falla, ({}, uso con lo que se sepa)."""
    uso = {"modelo": MODELO_LECTOR, "version_prompt": VERSION_PROMPT, "tokens_entrada": 0, "tokens_salida": 0}
    raw = ""
    senal = lector.senales(text)          # lo exacto (ccf, no fee, %, apps) lo lee el código
    try:
        response = client.chat.completions.create(
            model=MODELO_LECTOR,
            max_completion_tokens=2000,   # incluye lo que razona: este modelo no acepta max_tokens
            messages=[
                {"role": "system", "content": lector.PROMPT},
                {"role": "user",   "content": text}
            ]
        )
        if getattr(response, "usage", None):
            uso["tokens_entrada"] = response.usage.prompt_tokens or 0
            uso["tokens_salida"] = response.usage.completion_tokens or 0

        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        result = lector.completa(json.loads(raw), senal)

        # Agregar lista de campos faltantes al resultado
        faltantes = [f for f in ["job_type", "tipo_pago"] if not result.get(f)]
        result["faltantes"] = faltantes
        return result, uso

    except json.JSONDecodeError:
        print(f"[ERROR] La IA no devolvió JSON válido: {raw}")
        return {}, uso
    except Exception as e:
        print(f"[ERROR] Fallo en la API: {e}")
        return {}, uso


def parse_ticket(text: str) -> dict:
    """
    Le pasa el mensaje a la IA y devuelve el JSON limpio.
    Los campos que la IA no pueda identificar vienen en null —
    es tu código el que decide qué hacer con esos nulls.
    """
    return parse_ticket_con_uso(text)[0]


def updateRegistroController(id: int, data, db: Session):

    registro = db.query(registrosSchemma).filter(
        registrosSchemma.id == id
    ).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    try:
        cambios = data.dict(exclude_unset=True)
        total_panel = cambios.pop("total", None)
        cambios.pop("id", None)
        for key, value in cambios.items():
            setattr(registro, key, value)
        # Plan del bot, fase 2: el servidor manda en el total.
        servicio_calculo.recalcula(db, registro, total_panel)

        db.commit()
        db.refresh(registro)

        return {"message": "Registro actualizado correctamente", "registro": _con_lectura(db, [registro])[0]}

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


def validarJobDuplicado(job_name: str, db: Session):
    job_name = job_name.strip().upper()
    print(f"Buscando job_name: '{job_name}'")  # ✅

    registro = db.query(registrosSchemma).filter(
        func.upper(func.trim(registrosSchemma.job_name)) == job_name
    ).first()
    print(f"Resultado: {registro}")  # ✅
    print(registro)
    if not registro:
        return { "existe": False, "tecnico": None }

    return {
        "existe": True,
        "tecnico": {
            "nombre": registro.nombre,
            "job": registro.job,
            "job_name": registro.job_name,
            "semana": registro.semana.semana,  # ✅ label directo por relación
            "fecha_inicio": str(registro.semana.fecha_inicio),
            "fecha_fin": str(registro.semana.fecha_fin),
            "total": registro.total,
        }
    }

def bulkUpdateRegistros(registros: List[UpdateRegistroSchema], db: Session):
    try:
        tocados = []
        for item in registros:
            registro = db.query(registrosSchemma).filter(
                registrosSchemma.id == item.id
            ).first()
            if not registro:
                continue
            cambios = item.dict(exclude_unset=True)
            total_panel = cambios.pop("total", None)
            cambios.pop("id", None)
            for key, value in cambios.items():
                setattr(registro, key, value)
            # Plan del bot, fase 2: el servidor manda en el total (y devuelve lo que quedó, para que el panel cuadre).
            servicio_calculo.recalcula(db, registro, total_panel)
            tocados.append(registro)
        respuesta = _con_lectura(db, tocados)
        db.commit()
        return {"message": "Registros actualizados correctamente", "registros": respuesta}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))