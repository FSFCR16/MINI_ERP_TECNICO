"""
Controladores del módulo VIRGINIA. No importan lógica de negocio del general.
Solo se reutilizan helpers de fecha puros (`semana_actual`, `obtener_rango_semana`) de utils.py.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from sqlalchemy.exc import IntegrityError

from app.models_virginia import (
    TecnicoVirginia, ConfigVirginia, MetodoPagoVirginia,
    SemanaVirginia, RegistroVirginia, ParteVirginia,
)
from app.utils import semana_actual, obtener_rango_semana, datos_semana_desde_label, semanas_recientes
from app.utils_virginia import generarExcelVirginia

import os
import re
import json
from openai import OpenAI


# ══════════════════════════════════════════════
#  TÉCNICOS (persona)
# ══════════════════════════════════════════════
def listarTecnicosVirginia(db: Session):
    return db.query(TecnicoVirginia).order_by(TecnicoVirginia.nombre.asc()).all()


# Métodos de pago base que TODO técnico debe tener.
# (MIXTO no es un método con trato: es la opción de pago dividido, siempre disponible en la UI.)
METODOS_BASE = [("Cash", "CASH", True), ("CC", "CC", False)]


def _sembrar_metodos_base(tecnico_id: int, db: Session):
    """Crea los métodos base (Cash, CC) que falten para un técnico. Idempotente."""
    existentes = {
        m.nombre.strip().lower()
        for m in db.query(MetodoPagoVirginia)
        .filter(MetodoPagoVirginia.tecnico_virginia_id == tecnico_id).all()
    }
    creo = False
    for nombre, trato, principal in METODOS_BASE:
        if nombre.lower() not in existentes:
            db.add(MetodoPagoVirginia(
                tecnico_virginia_id=tecnico_id, nombre=nombre, trato=trato, principal=principal,
            ))
            creo = True
    if creo:
        db.commit()


def crearTecnicoVirginia(data, db: Session):
    try:
        nuevo = TecnicoVirginia(
            nombre=data.nombre.strip().upper(),
            valor_adicional=data.valor_adicional,
        )
        db.add(nuevo)
        db.commit()
        _sembrar_metodos_base(nuevo.id, db)   # siembra Cash + CC base (hace su propio commit)
        db.refresh(nuevo)                     # refrescar DESPUÉS del seed: su commit expira a `nuevo`
        return nuevo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un técnico con ese nombre")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def actualizarTecnicoVirginia(id: int, data, db: Session):
    tecnico = db.query(TecnicoVirginia).filter(TecnicoVirginia.id == id).first()
    if not tecnico:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    try:
        cambios = data.dict(exclude_unset=True)
        if "nombre" in cambios and cambios["nombre"] is not None:
            cambios["nombre"] = cambios["nombre"].strip().upper()
        for key, value in cambios.items():
            setattr(tecnico, key, value)
        db.commit()
        db.refresh(tecnico)
        return tecnico
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def eliminarTecnicoVirginia(id: int, db: Session):
    tecnico = db.query(TecnicoVirginia).filter(TecnicoVirginia.id == id).first()
    if not tecnico:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    db.delete(tecnico)
    db.commit()
    return {"message": "Técnico eliminado correctamente"}


def obtenerNombresVirginia(db: Session):
    tecnicos = db.query(TecnicoVirginia).order_by(TecnicoVirginia.nombre.asc()).all()
    return [t.nombre for t in tecnicos]


def infoTecnicoVirginia(nombre: str, db: Session):
    """Devuelve el técnico con sus configs por job (lo que consume la carga de registros)."""
    tecnico = db.query(TecnicoVirginia).filter(
        TecnicoVirginia.nombre == nombre.upper()
    ).first()
    if not tecnico:
        raise HTTPException(status_code=404, detail=f"No se encontró el técnico {nombre}")

    configs = db.query(ConfigVirginia).filter(
        ConfigVirginia.tecnico_virginia_id == tecnico.id
    ).all()

    return {
        "id": tecnico.id,
        "nombre": tecnico.nombre,
        "valor_adicional": tecnico.valor_adicional,
        "configs": configs,
        "metodos_pago": tecnico.metodos_pago,
    }


# ══════════════════════════════════════════════
#  CONFIG por job
# ══════════════════════════════════════════════
def listarConfigVirginia(tecnico_id: int, db: Session):
    return db.query(ConfigVirginia).filter(
        ConfigVirginia.tecnico_virginia_id == tecnico_id
    ).all()


def crearConfigVirginia(data, db: Session):
    try:
        porcentaje_gil = round(100 - (data.porcentaje_tecnico or 0), 2)
        nuevo = ConfigVirginia(
            tecnico_virginia_id=data.tecnico_virginia_id,
            job=data.job.strip().upper(),
            porcentaje_tecnico=data.porcentaje_tecnico,
            porcentaje_gil=porcentaje_gil,
            minimo=data.minimo,
            cargo_sabados=data.cargo_sabados,
            porcentaje_adicional_empresa=data.porcentaje_adicional_empresa,
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ese técnico ya tiene config para ese job")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def actualizarConfigVirginia(id: int, data, db: Session):
    config = db.query(ConfigVirginia).filter(ConfigVirginia.id == id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config no encontrada")
    try:
        cambios = data.dict(exclude_unset=True)
        if "job" in cambios and cambios["job"] is not None:
            cambios["job"] = cambios["job"].strip().upper()
        for key, value in cambios.items():
            setattr(config, key, value)
        # recalcular % gil si cambió el % técnico
        if "porcentaje_tecnico" in cambios and cambios["porcentaje_tecnico"] is not None:
            config.porcentaje_gil = round(100 - cambios["porcentaje_tecnico"], 2)
        db.commit()
        db.refresh(config)
        return config
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def eliminarConfigVirginia(id: int, db: Session):
    config = db.query(ConfigVirginia).filter(ConfigVirginia.id == id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config no encontrada")
    db.delete(config)
    db.commit()
    return {"message": "Config eliminada correctamente"}


# ══════════════════════════════════════════════
#  MÉTODOS DE PAGO
# ══════════════════════════════════════════════
def listarMetodosPago(tecnico_id: int, db: Session):
    return db.query(MetodoPagoVirginia).filter(
        MetodoPagoVirginia.tecnico_virginia_id == tecnico_id
    ).all()


def crearMetodoPago(data, db: Session):
    try:
        if data.principal:
            _desmarcarPrincipal(data.tecnico_virginia_id, db)
        nuevo = MetodoPagoVirginia(
            tecnico_virginia_id=data.tecnico_virginia_id,
            nombre=data.nombre.strip(),
            trato=data.trato,
            principal=data.principal,
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def actualizarMetodoPago(id: int, data, db: Session):
    metodo = db.query(MetodoPagoVirginia).filter(MetodoPagoVirginia.id == id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    try:
        cambios = data.dict(exclude_unset=True)
        if cambios.get("principal") is True:
            _desmarcarPrincipal(metodo.tecnico_virginia_id, db)
        for key, value in cambios.items():
            setattr(metodo, key, value)
        db.commit()
        db.refresh(metodo)
        return metodo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def eliminarMetodoPago(id: int, db: Session):
    metodo = db.query(MetodoPagoVirginia).filter(MetodoPagoVirginia.id == id).first()
    if not metodo:
        raise HTTPException(status_code=404, detail="Método no encontrado")
    db.delete(metodo)
    db.commit()
    return {"message": "Método eliminado correctamente"}


def _desmarcarPrincipal(tecnico_id: int, db: Session):
    """Solo un método puede ser principal por técnico."""
    db.query(MetodoPagoVirginia).filter(
        MetodoPagoVirginia.tecnico_virginia_id == tecnico_id,
        MetodoPagoVirginia.principal.is_(True),
    ).update({"principal": False}, synchronize_session=False)


# ══════════════════════════════════════════════
#  SEMANAS
# ══════════════════════════════════════════════
def validarSemanaVirginia(db: Session, semana_label: str = None):
    label_actual, year, num_semana = semana_actual()
    fecha_inicio, fecha_fin = obtener_rango_semana()

    objetivo = semana_label or label_actual

    registro = db.query(SemanaVirginia).filter(
        SemanaVirginia.semana == objetivo
    ).first()
    if registro:
        return registro

    # 🔹 Crear la semana ACTUAL
    if objetivo == label_actual:
        try:
            registro = SemanaVirginia(
                year_num=year, numero_semana=num_semana, semana=label_actual,
                fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
            )
            db.add(registro)
            db.commit()
            db.refresh(registro)
            return registro
        except IntegrityError:
            db.rollback()
            return db.query(SemanaVirginia).filter(
                SemanaVirginia.semana == label_actual
            ).first()

    # 🔹 Crear una semana ANTERIOR a la actual (solo pasadas)
    datos = datos_semana_desde_label(objetivo)
    if not datos:
        raise HTTPException(status_code=400, detail="Etiqueta de semana inválida")
    _, anio_l, num_l, ini_l, fin_l = datos
    if ini_l >= fecha_inicio:
        raise HTTPException(status_code=400, detail="Solo se pueden crear semanas anteriores a la actual")
    try:
        registro = SemanaVirginia(
            year_num=anio_l, numero_semana=num_l, semana=objetivo,
            fecha_inicio=ini_l, fecha_fin=fin_l,
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro
    except IntegrityError:
        db.rollback()
        return db.query(SemanaVirginia).filter(
            SemanaVirginia.semana == objetivo
        ).first()


def semanasRecientesVirginia(n: int = 8):
    return semanas_recientes(n)


def validarJobDuplicadoVirginia(job_name: str, db: Session):
    job_name = (job_name or "").strip().upper()
    fila = (
        db.query(RegistroVirginia, SemanaVirginia)
        .join(SemanaVirginia, RegistroVirginia.semana_virginia_id == SemanaVirginia.id)
        .filter(func.upper(func.trim(RegistroVirginia.job_name)) == job_name)
        .first()
    )
    if not fila:
        return {"existe": False, "tecnico": None}
    registro, semana = fila
    return {
        "existe": True,
        "tecnico": {
            "nombre": registro.nombre,
            "job": registro.job,
            "job_name": registro.job_name,
            "semana": semana.semana,
            "fecha_inicio": str(semana.fecha_inicio),
            "fecha_fin": str(semana.fecha_fin),
            "total": registro.total,
        },
    }


def obtenerSemanasVirginia(db: Session):
    return db.query(SemanaVirginia).order_by(desc(SemanaVirginia.fecha_inicio)).all()


def obtenerTecnicosPorSemanaVirginia(semana_id: int, db: Session):
    resumen = (
        db.query(
            func.max(RegistroVirginia.id).label("id"),
            RegistroVirginia.nombre,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
            SemanaVirginia.semana,
            SemanaVirginia.id.label("semana_id"),
            func.sum(RegistroVirginia.total).label("total_generado"),
            func.count(RegistroVirginia.nombre).label("total_registros"),
        )
        .join(SemanaVirginia, RegistroVirginia.semana_virginia_id == SemanaVirginia.id)
        .filter(RegistroVirginia.semana_virginia_id == semana_id)
        .group_by(
            RegistroVirginia.nombre,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
            SemanaVirginia.semana,
            SemanaVirginia.id,
        )
        .order_by(RegistroVirginia.nombre.asc())
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
            "total_registros": row.total_registros,
        }
        for row in resumen
    ]


def eliminarSemanaVirginia(semana_id: int, db: Session):
    semana = db.query(SemanaVirginia).filter(SemanaVirginia.id == semana_id).first()
    if not semana:
        raise HTTPException(status_code=404, detail="Semana no encontrada")
    db.delete(semana)
    db.commit()
    return {"message": "Semana eliminada correctamente"}


def historialTecnicoVirginia(nombre: str, db: Session):
    """Semanas en las que el técnico tiene registros (para el modal de Historial)."""
    resumen = (
        db.query(
            RegistroVirginia.nombre,
            SemanaVirginia.semana,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
            SemanaVirginia.id.label("semana_id"),
            func.count(RegistroVirginia.id).label("total_registros"),
        )
        .join(SemanaVirginia, RegistroVirginia.semana_virginia_id == SemanaVirginia.id)
        .filter(RegistroVirginia.nombre == nombre)
        .group_by(
            RegistroVirginia.nombre,
            SemanaVirginia.id,
            SemanaVirginia.semana,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
        )
        .order_by(SemanaVirginia.fecha_inicio.desc())
        .all()
    )
    return [
        {
            "nombre": row.nombre,
            "semana_id": row.semana_id,
            "semana": row.semana,
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin": row.fecha_fin,
            "total_registros": row.total_registros,
        }
        for row in resumen
    ]


def eliminarTecnicoSemanaVirginia(nombre: str, semana_id: int, db: Session):
    """Quita un técnico de una semana borrando sus registros de esa semana."""
    db.query(RegistroVirginia).filter(
        RegistroVirginia.nombre == nombre,
        RegistroVirginia.semana_virginia_id == semana_id,
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Registros del técnico eliminados correctamente"}


def historialTodosVirginia(db: Session):
    """Todos los técnicos-semana de Virginia (para el dashboard unificado)."""
    resumen = (
        db.query(
            RegistroVirginia.nombre,
            SemanaVirginia.semana,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
            SemanaVirginia.id.label("semana_id"),
            func.sum(RegistroVirginia.total).label("total"),
            func.count(RegistroVirginia.id).label("total_registros"),
        )
        .join(SemanaVirginia, RegistroVirginia.semana_virginia_id == SemanaVirginia.id)
        .group_by(
            RegistroVirginia.nombre,
            SemanaVirginia.id,
            SemanaVirginia.semana,
            SemanaVirginia.fecha_inicio,
            SemanaVirginia.fecha_fin,
        )
        .order_by(SemanaVirginia.fecha_inicio.desc(), RegistroVirginia.nombre.asc())
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


# ══════════════════════════════════════════════
#  REGISTROS
# ══════════════════════════════════════════════
def envioRegistrosVirginia(registros, db: Session, semana: str):
    if not registros:
        raise HTTPException(status_code=400, detail="No se enviaron registros")

    semanaDB = db.query(SemanaVirginia).filter(SemanaVirginia.semana == semana).first()
    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")

    try:
        creados = []
        for r in registros:
            nuevo = RegistroVirginia(
                tecnico_virginia_id=r.id_tecnico,
                semana_virginia_id=semanaDB.id,
                nombre=r.nombre,
                job=r.job,
                job_name=r.job_name,
                valor_servicio=r.valor_servicio,
                metodo_pago=r.metodo_pago,
                tipo_pago=r.tipo_pago,
                valor_efectivo=r.valor_efectivo,
                valor_tarjeta=r.valor_tarjeta,
                porcentaje_tecnico=r.porcentaje_tecnico,
                participacion=r.participacion,
                subtotal=r.subtotal,
                total=r.total,
            )
            db.add(nuevo)
            db.flush()
            creados.append({"id": nuevo.id, "job": nuevo.job})
        db.commit()
        return {"message": "Registros agregados correctamente", "registros": creados}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al insertar registros: {str(e)}")


def obtenerRegistrosSemanaVirginia(nombre: str, semana: str, db: Session):
    semanaDB = db.query(SemanaVirginia).filter(SemanaVirginia.semana == semana).first()
    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")
    return (
        db.query(RegistroVirginia)
        .filter(
            RegistroVirginia.semana_virginia_id == semanaDB.id,
            RegistroVirginia.nombre == nombre,
        )
        .order_by(RegistroVirginia.created_at.asc())
        .all()
    )


def actualizarRegistroVirginia(id: int, data, db: Session):
    registro = db.query(RegistroVirginia).filter(RegistroVirginia.id == id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    try:
        for key, value in data.dict(exclude_unset=True).items():
            if key == "id":
                continue
            setattr(registro, key, value)
        db.commit()
        db.refresh(registro)
        return {"message": "Registro actualizado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def bulkUpdateRegistrosVirginia(registros, db: Session):
    try:
        for item in registros:
            registro = db.query(RegistroVirginia).filter(
                RegistroVirginia.id == item.id
            ).first()
            if not registro:
                continue
            for key, value in item.dict(exclude_unset=True).items():
                if key == "id":
                    continue
                setattr(registro, key, value)
        db.commit()
        return {"message": "Registros actualizados correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def eliminarRegistrosVirginia(ids, db: Session):
    try:
        db.query(RegistroVirginia).filter(
            RegistroVirginia.id.in_(ids)
        ).delete(synchronize_session=False)
        db.commit()
        return {"message": "Registros eliminados correctamente"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error eliminando registros")


# ══════════════════════════════════════════════
#  PARTES
# ══════════════════════════════════════════════
def agregarParteVirginia(data, db: Session):
    semanaDB = db.query(SemanaVirginia).filter(SemanaVirginia.semana == data.semana).first()
    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")
    try:
        nuevo = ParteVirginia(
            tecnico_virginia_id=data.tecnico_virginia_id,
            semana_virginia_id=semanaDB.id,
            job=data.job,
            valor=data.valor,
            porcentaje_tecnico=data.porcentaje_tecnico,
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def listarPartesVirginia(tecnico_id: int, semana: str, db: Session):
    semanaDB = db.query(SemanaVirginia).filter(SemanaVirginia.semana == semana).first()
    if not semanaDB:
        raise HTTPException(status_code=404, detail="La semana solicitada no existe")
    return (
        db.query(ParteVirginia)
        .filter(
            ParteVirginia.tecnico_virginia_id == tecnico_id,
            ParteVirginia.semana_virginia_id == semanaDB.id,
        )
        .order_by(ParteVirginia.created_at.asc())
        .all()
    )


def eliminarParteVirginia(id: int, db: Session):
    parte = db.query(ParteVirginia).filter(ParteVirginia.id == id).first()
    if not parte:
        raise HTTPException(status_code=404, detail="Parte no encontrada")
    db.delete(parte)
    db.commit()
    return {"message": "Parte eliminada correctamente"}


# ══════════════════════════════════════════════
#  EXPORT EXCEL
# ══════════════════════════════════════════════
def exportarExcelVirginia(registro_ids, nombre: str, semana: str, db: Session):
    registros = (
        db.query(RegistroVirginia)
        .filter(RegistroVirginia.id.in_(registro_ids))
        .order_by(RegistroVirginia.created_at.asc())
        .all()
    )
    if not registros:
        raise HTTPException(status_code=404, detail="No hay registros para exportar")

    # partes del técnico+semana (para la fila 'parts')
    tecnico_id = registros[0].tecnico_virginia_id
    semana_id = registros[0].semana_virginia_id
    partes = (
        db.query(ParteVirginia)
        .filter(
            ParteVirginia.tecnico_virginia_id == tecnico_id,
            ParteVirginia.semana_virginia_id == semana_id,
        )
        .all()
    )

    output = generarExcelVirginia(registros, partes)
    nombre_archivo = f"virginia_{nombre}_semana_{semana}.xlsx"
    return output, nombre_archivo


# ══════════════════════════════════════════════
#  PARSER IA (prompt separado para Virginia)
# ══════════════════════════════════════════════
_va_client = OpenAI(api_key=os.getenv("API_KEY_CHAT"))

SYSTEM_PROMPT_VIRGINIA = """
Eres un extractor de datos de tickets de servicio de cerrajería para la empresa VIRGINIA.
Devuelve SOLO un JSON válido. Sin texto extra, sin markdown, sin explicaciones.

━━━ REGLAS GENERALES ━━━
- Si un campo no está claro en el mensaje → null
- NUNCA inventes datos
- En Virginia NO se manejan partes (parts). Ignora cualquier monto de partes; no lo extraigas.

━━━ MÉTODOS DE PAGO DE ESTE TÉCNICO (nombre → trato) ━━━
{{METODOS}}
- El "trato" de cada método es lo que define si su monto es CASH (efectivo) o CC (tarjeta).
- En el mensaje busca cómo se pagó (ej: "cash", "uleadz", "zelle", "cashapp", "$100 cash $120 uleadz").
- Hacé MATCH del pago mencionado con uno de los métodos de la lista de arriba (por nombre o sinónimo obvio:
  cash/efectivo → un método llamado Cash; card/credit/cc/tarjeta → un método llamado CC).
- "metodo_pago" = el NOMBRE EXACTO del método de la lista que coincide.
- "tipo_pago" = el TRATO de ese método ("CASH" o "CC").
- Si el método mencionado NO coincide con ninguno de la lista → metodo_pago=null y tipo_pago=null
  (NO adivines; se completará/creará manualmente).
- Si NO se menciona ningún pago → metodo_pago=null, tipo_pago=null.
- Entendé faltas de ortografía / variantes: "squere"→Square, "zele"→Zelle, "uleads"→Uleadz, etc.

━━━ MÉTODOS NO RECONOCIDOS (para crearlos) ━━━
- "metodos_no_reconocidos" = lista de los nombres de pago MENCIONADOS en el mensaje que NO coinciden
  con NINGÚN método de la lista del técnico (corregí ortografía y capitalizá: ej "Square", "Zelle").
- Aplica a pago simple Y a MIXTO: en un mixto, si una de las patas no está en la lista, incluí ESE
  método acá (ej: "$200 cash $885 square" con Square no configurado → ["Square"]).
- Si todos los métodos mencionados están en la lista, o no se menciona pago → [] (lista vacía).
- IMPORTANTE: si un método mencionado SÍ está en la lista (aunque venga con typo, ej "squere" y existe
  "Square"), NO lo pongas acá. Solo van los que de verdad no existen en la lista.

━━━ MIXTO (pago dividido) ━━━
- Si hay DOS o más pagos con métodos de DISTINTO trato (uno CASH y otro CC) en el mismo mensaje:
  → metodo_pago="MIXTO", tipo_pago="MIXTO"
  → valor_efectivo = suma de los montos pagados con métodos de trato CASH
  → valor_tarjeta  = suma de los montos pagados con métodos de trato CC
  → valor_servicio = valor_efectivo + valor_tarjeta (el total)
- Si los dos pagos son del MISMO trato → NO es mixto (sumalos en valor_servicio con ese único trato).

━━━ JOB TYPE — solo: "CAR KEY", "LOCKOUT", "PVT JOBS", null ━━━
- CAR KEY: car key, car key made, key made, key program, key programming, key duplicate
- LOCKOUT: lockout, car lockout, car lock-out, house lockout, business lockout, lock out, lock change
- PVT JOBS: pvt, private, private job, pvt job
- Si no hay variante clara → null

━━━ VALORES ━━━
- valor_servicio: el precio del servicio. Tomalo de "Price <n>", "Customer paid $<n>", o "$<n> <metodo>".
- IGNORA por completo líneas tipo "Service Fee $29.00", "Price From: $19.00 - $200.00" y cualquier rango:
  esos NO son el precio. El precio real es el monto explícito junto al pago / "Price <n>".
- valor_efectivo / valor_tarjeta: SOLO en MIXTO (ver arriba). En pago simple ambos = 0.

━━━ PARTICIPACIÓN (trabajo compartido / % propio) ━━━
- El técnico que estás procesando es: "{{TECNICO}}".
- "participacion" = el porcentaje del job que le corresponde A ESTE TÉCNICO (número 1-100).
- Si el mensaje describe un trabajo COMPARTIDO entre varios técnicos con porcentajes
  (ej: "Khan 90%", "Syed 10%", "se reparte 90/10", "una llave usada del carro de Khan 90%"):
  → buscá el nombre de ESTE técnico ("{{TECNICO}}") en el mensaje y devolvé SU porcentaje.
- Si el nombre de este técnico NO aparece, o NO hay ningún reparto/porcentaje → participacion = 100.
- NO inventes repartos: si no hay porcentajes explícitos, siempre 100.

━━━ CAMPOS A EXTRAER ━━━
{
  "job_name":        "código o número del ticket | null",
  "nombre":          "nombre del cliente | null",
  "job_type":        "CAR KEY | LOCKOUT | PVT JOBS | null",
  "valor_servicio":  número o 0,
  "valor_efectivo":  número o 0,
  "valor_tarjeta":   número o 0,
  "metodo_pago":     "nombre exacto del método | MIXTO | null",
  "metodos_no_reconocidos": ["nombres de pago mencionados que no están en la lista"],
  "tipo_pago":       "CASH | CC | MIXTO | null",
  "participacion":   número 1-100 (default 100)
}
"""


def parse_ticket_virginia(text: str, metodos=None, nombre_tecnico=None) -> dict:
    metodos = metodos or []
    lista = "\n".join(
        f'- "{m.get("nombre")}" → trato {m.get("trato")}'
        for m in metodos if m.get("nombre")
    ) or "- (este técnico no tiene métodos configurados)"
    system = (
        SYSTEM_PROMPT_VIRGINIA
        .replace("{{METODOS}}", lista)
        .replace("{{TECNICO}}", (nombre_tecnico or "—").strip())
    )
    try:
        response = _va_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=500,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": text},
            ],
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)
        result["faltantes"] = [f for f in ["job_type", "tipo_pago"] if not result.get(f)]
        return result
    except json.JSONDecodeError:
        return {}
    except Exception as e:
        print(f"[ERROR Virginia parser] {e}")
        return {}
