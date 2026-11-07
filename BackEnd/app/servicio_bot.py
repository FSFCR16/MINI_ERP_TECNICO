"""
EL ERP DEL LADO DEL BOT (plan del bot, fase 3 · PLAN_BOT_CHAT.md §4-§9).

El chat de GAELA es solo el puerto: recibe los mensajes de WhatsApp y los manda aquí. El ERP es el dueño de los datos,
de la lectura con IA (el MISMO `parse_ticket` del panel), del cálculo (el del servidor, fase 2) y del Excel.

Todo lo que entra por el bot queda «por_validar» hasta que una persona lo aprueba en el panel. Lo que no se puede
calcular (🔴) NO entra: se queda en el historial con el motivo y lo que falta, para completarlo (formulario o chat).
"""

from __future__ import annotations

import difflib
import json
import os
import re
import unicodedata
import uuid
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Callable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import calculo, servicio_alertas, servicio_calculo
from app.controllers import exporToExcelController, parse_ticket_con_uso, validarTecnicoSemana
from app.models import SemanaTecnico, Trabajo, registrosSchemma
from app.models_bot import MensajeBot
from app.models_notas import NotaTecnico

POR_VALIDAR = "por_validar"

# Precio de gpt-6-luna en USD por millón de tokens (openai.com/api/pricing). Si OpenAI lo cambia, se ajusta con
# las variables de entorno sin tocar el código.
PRECIO_ENTRADA = float(os.getenv("ERP_PRECIO_ENTRADA_USD_M", "0.10"))
PRECIO_SALIDA = float(os.getenv("ERP_PRECIO_SALIDA_USD_M", "0.50"))

MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
MESES_LARGOS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
                "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
                "january": 1, "february": 2, "march": 3, "april": 4, "june": 6, "july": 7, "august": 8,
                "september": 9, "october": 10, "november": 11, "december": 12}

# Los 🔴: con uno de estos el trabajo NO entra (la fórmula no puede dar un total confiable).
MOTIVOS = {
    "sin_lectura": "No pude leer el mensaje.",
    "sin_tecnico": "No sé de qué técnico es.",
    "sin_contrato": "El técnico no tiene contrato para ese tipo de trabajo.",
    "sin_valor": "No trae el valor del servicio.",
    "mixto_sin_reparto": "Es MIXTO y no dice cuánto fue en cash y cuánto con tarjeta.",
    "repetido": "Ese job ya está registrado.",
    "sin_calculo": "Con esos datos la parte del técnico da 0 o menos: no se puede calcular.",
}
# Qué campo hay que pedir para cada 🔴 (el formulario de la fase 6 muestra solo esto).
FALTA = {"sin_tecnico": ["tecnico"], "sin_contrato": ["job"], "sin_valor": ["valor_servicio"],
         "mixto_sin_reparto": ["valor_efectivo", "valor_tarjeta"], "repetido": ["job_name"],
         "sin_calculo": ["valor_servicio", "partes_tecnico", "partes_gil"], "sin_lectura": ["texto"]}


# ─────────────────────────────── texto ───────────────────────────────
def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Za-z0-9 ]+", " ", s)).strip().upper()


def _num_js(v: float | int | None) -> str:
    """Como JS pinta un número en una plantilla: 50 → «50», 2.5 → «2.5»."""
    if v is None:
        return "null"
    f = float(v)
    return str(int(f)) if f.is_integer() else repr(f)


# ─────────────────────────────── técnico (§5) ───────────────────────────────
def nombres_tecnicos(db: Session) -> list[str]:
    return sorted({t.nombre for t in db.query(Trabajo).all() if t.nombre})


def _candidatos(trozo: str, nombres: list[str]) -> list[str]:
    por_norm = {_norm(n): n for n in nombres}
    return [por_norm[c] for c in difflib.get_close_matches(_norm(trozo), list(por_norm), n=3, cutoff=0.75)]


def reconoce_tecnico(texto: str, nombres: list[str]) -> dict[str, Any]:
    """C: el nombre en la primera línea del mensaje («Afik ***»). Exacto o casi exacto, SIN aprender apodos.
    Devuelve {"nombre": str|None, "candidatos": [...], "solo_nombre": bool} — `solo_nombre` = el mensaje es solo un
    nombre (B: marca la tanda)."""
    lineas = [l for l in (texto or "").splitlines() if _norm(l)]
    if not lineas:
        return {"nombre": None, "candidatos": [], "solo_nombre": False}
    primera = _norm(lineas[0])
    por_norm = {_norm(n): n for n in nombres}
    palabras = primera.split()
    # B: una sola línea, hasta 3 palabras y SIN números (un trabajo siempre trae números: «300 cash» no es un nombre)
    solo = len(lineas) == 1 and 0 < len(palabras) <= 3 and not re.search(r"\d", primera)
    for trozo in (primera, " ".join(palabras[:2]), palabras[0] if palabras else ""):
        if trozo in por_norm:
            return {"nombre": por_norm[trozo], "candidatos": [], "solo_nombre": solo and trozo == primera}
    # casi exacto: solo en el primer trozo y solo si hay UNO muy parecido (una letra de más o de menos)
    cerca = [c for c in _candidatos(palabras[0], nombres)
             if difflib.SequenceMatcher(None, _norm(c), palabras[0]).ratio() >= 0.88] if palabras else []
    if len(cerca) == 1 and len(palabras[0]) >= 4:
        return {"nombre": cerca[0], "candidatos": [], "solo_nombre": solo and len(palabras) == 1}
    if solo:   # parece un nombre que no está: se ofrecen los parecidos
        return {"nombre": None, "candidatos": _candidatos(primera, nombres), "solo_nombre": True}
    return {"nombre": None, "candidatos": [], "solo_nombre": False}


# ─────────────────────────────── semana (§4) ───────────────────────────────
def etiqueta_semana(lunes: date) -> str:
    iso = lunes.isocalendar()
    return f"{iso[0]}_{lunes.month:02d}_semana_{iso[1]}"


def texto_rango(lunes: date) -> str:
    fin = lunes + timedelta(days=6)
    if lunes.month == fin.month:
        return f"{lunes.day} – {fin.day} {MESES[fin.month - 1]}"
    return f"{lunes.day} {MESES[lunes.month - 1]} – {fin.day} {MESES[fin.month - 1]}"


def _semana(lunes: date) -> dict[str, Any]:
    return {"label": etiqueta_semana(lunes), "numero": lunes.isocalendar()[1], "fecha_inicio": lunes.isoformat(),
            "fecha_fin": (lunes + timedelta(days=6)).isoformat(), "texto": texto_rango(lunes)}


def opciones_semana(hoy: date | None = None, n: int = 8) -> list[dict[str, Any]]:
    """La actual y las n anteriores. Los dos primeros son los botones; el resto, «Otra»."""
    hoy = hoy or date.today()
    lunes = hoy - timedelta(days=hoy.weekday())
    return [{**_semana(lunes - timedelta(weeks=i)), "actual": i == 0} for i in range(n + 1)]


def resuelve_semana(texto: str, hoy: date | None = None) -> dict[str, Any] | None:
    """«semana 44», «44», una fecha («3/11», «3/11/2026», «2026-11-03», «3 nov», «3 de noviembre») o la etiqueta
    «2026_11_semana_45». Nunca una semana futura. None si no se entiende."""
    hoy = hoy or date.today()
    lunes_hoy = hoy - timedelta(days=hoy.weekday())
    t = (texto or "").strip().lower()
    dia: date | None = None
    m = re.fullmatch(r"(\d{4})_\d{1,2}_semana_(\d{1,2})", t)
    if m:
        try:
            dia = date.fromisocalendar(int(m.group(1)), int(m.group(2)), 1)
        except ValueError:
            return None
    if dia is None:
        m = re.fullmatch(r"(?:la\s+)?(?:semana|sem|week|wk)?\s*#?\s*(\d{1,2})", t)
        if m:
            num, anio = int(m.group(1)), hoy.isocalendar()[0]
            if num > hoy.isocalendar()[1]:
                # «semana 50» en enero = la de diciembre pasado; «semana 46» estando en la 45 = error, no hace un año
                if not (hoy.isocalendar()[1] <= 8 and num >= 45):
                    return None
                anio -= 1
            try:
                dia = date.fromisocalendar(anio, num, 1)
            except ValueError:
                return None
    if dia is None:
        m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", t)
        if m:
            dia = _fecha(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    if dia is None:
        m = re.fullmatch(r"(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?", t)
        if m:
            anio = int(m.group(3)) if m.group(3) else hoy.year
            anio = anio + 2000 if anio < 100 else anio
            dia = _fecha(anio, int(m.group(2)), int(m.group(1)))
            if dia and not m.group(3) and dia > hoy:
                dia = _fecha(anio - 1, int(m.group(2)), int(m.group(1)))
    if dia is None:
        m = re.fullmatch(r"(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\.?(?:\s+(?:de\s+)?(\d{4}))?", t)
        if m:
            nombre = unicodedata.normalize("NFKD", m.group(2)).encode("ascii", "ignore").decode()
            mes = MESES_LARGOS.get(nombre) or (MESES.index(nombre[:3]) + 1 if nombre[:3] in MESES else None)
            if mes:
                anio = int(m.group(3)) if m.group(3) else hoy.year
                dia = _fecha(anio, mes, int(m.group(1)))
                if dia and not m.group(3) and dia > hoy:
                    dia = _fecha(anio - 1, mes, int(m.group(1)))
    if dia is None:
        return None
    lunes = dia - timedelta(days=dia.weekday())
    if lunes > lunes_hoy:
        return None
    return {**_semana(lunes), "actual": lunes == lunes_hoy}


def _fecha(a: int, m: int, d: int) -> date | None:
    try:
        return date(a, m, d)
    except ValueError:
        return None


def asegura_semana(db: Session, label: str) -> SemanaTecnico:
    """La misma regla del panel: crea la semana actual o una pasada, nunca una futura."""
    return validarTecnicoSemana(db, label)


# ─────────────────────────────── contrato y fila ───────────────────────────────
def _k(job: str | None) -> str:
    return (job or "").replace(" ", "").upper()


def elegir_contrato(contratos: list[Trabajo], job_type: str | None) -> Trabajo | None:
    """Como el panel: un contrato «TODO» vale para todo; si no, el del tipo de trabajo. Si el mensaje no dice el tipo
    y el técnico tiene un solo contrato, ese. Si no hay forma de saber, None (🔴 sin_contrato)."""
    if not contratos:
        return None
    todo = [c for c in contratos if _k(c.job) == "TODO"]
    if todo:
        return todo[0]
    if job_type:
        iguales = [c for c in contratos if _k(c.job) == _k(job_type)]
        return iguales[0] if iguales else None
    return contratos[0] if len(contratos) == 1 else None


def fila_desde_ia(ia: dict[str, Any], c: Trabajo) -> dict[str, Any]:
    """Lo que hace el panel con la lectura de la IA (`procesarMensaje` + `procesarDatosTecnico` + `handleBtnAgregar`
    + `actualizarPorcentajeCC`): los datos del mensaje sobre la base del contrato."""
    n = lambda v: float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0  # noqa: E731
    tipo = str(ia.get("tipo_pago") or "CASH").upper()
    empresa = float(c.porcentaje_adicional_empresa or 0)
    fila = {
        "tecnico_id": c.id, "nombre": c.nombre, "job": c.job,
        "job_name": str(ia["job_name"]).upper() if ia.get("job_name") else "",
        "valor_servicio": n(ia.get("valor_servicio")), "valor_efectivo": n(ia.get("valor_efectivo")),
        "valor_tarjeta": n(ia.get("valor_tarjeta")), "partes_tecnico": n(ia.get("parts_tecnico")),
        "partes_gil": n(ia.get("parts_gil")), "tech": n(ia.get("tech")), "tipo_pago": tipo,
        "porcentaje_tecnico": float(c.porcentaje_tecnico or 0), "minimo": float(c.minimo or 0),
        "adicional_dolar": float(c.adicional_dolar or 0), "is_cash": False,
        "aplica_dolar_empresa": "SI" if empresa > 0 else "NO", "dolar_adicional_empresa": empresa,
        "porcentaje_cc": 0.0, "subtotal": 0.0, "total": 0.0,
    }
    if tipo != "MIXTO":                       # handleBtnAgregar: fuera de MIXTO no hay reparto
        fila["valor_efectivo"] = fila["valor_tarjeta"] = 0.0
    con_cc = calculo.porcentaje_cc({**fila, "porcentaje_cc_base": c.porcentaje_cc})
    fila["porcentaje_cc"] = float(con_cc.get("porcentaje_cc") or 0)
    return fila


def bloqueo(db: Session, fila: dict[str, Any], excluir_id: int | None = None) -> str | None:
    """El primer 🔴 que impide que el trabajo entre (o None). `excluir_id`: el propio trabajo, al corregirlo."""
    if fila["valor_servicio"] <= 0:
        return "sin_valor"
    if fila["tipo_pago"] == "MIXTO" and (fila["valor_efectivo"] <= 0 or fila["valor_tarjeta"] <= 0):
        return "mixto_sin_reparto"
    if fila["job_name"]:
        q = db.query(registrosSchemma).filter(
            func.upper(func.trim(registrosSchemma.job_name)) == fila["job_name"].strip().upper())
        if excluir_id is not None:
            q = q.filter(registrosSchemma.id != excluir_id)
        if q.first():
            return "repetido"
    # La fórmula deja el total como venía cuando ninguna regla aplica: se entra con NaN y, si sale NaN (también en
    # MIXTO, donde se suman las dos partes), no hay regla que calcule ese trabajo.
    total = calculo.procesar({**fila, "total": float("nan")}).get("total")
    if total is None or total != total:
        return "sin_calculo"
    return None


# ─────────────────────────────── crear (la tanda) ───────────────────────────────
Lector = Callable[[str], tuple[dict, dict]]


def _lector_por_defecto(texto: str) -> tuple[dict, dict]:
    return parse_ticket_con_uso(texto)


def costo(uso: dict[str, Any]) -> float:
    return round((uso.get("tokens_entrada", 0) * PRECIO_ENTRADA + uso.get("tokens_salida", 0) * PRECIO_SALIDA) / 1e6, 6)


def _respuesta(m: MensajeBot, reg: registrosSchemma | None = None, **extra) -> dict[str, Any]:
    r = {"mensaje_id": m.id, "wamid": m.wamid, "estado": m.estado, "tecnico": m.tecnico,
         "motivo": MOTIVOS.get(m.estado), "falta": FALTA.get(m.estado, []), **extra}
    if reg is not None:
        r["registro"] = {**servicio_calculo.fila_respuesta(reg), "valor_servicio": reg.valor_servicio,
                         "tipo_pago": reg.tipo_pago, "nombre": reg.nombre,
                         "alertas": json.loads(reg.alertas) if reg.alertas else []}
    elif m.estado in MOTIVOS:
        # Lo que sí se leyó, para que el formulario (fase 6) venga ya lleno y solo pida lo que falta.
        ia = json.loads(m.salida_ia or "{}") or {}
        r["leido"] = {k: ia.get(kia) for k, kia in CAMPOS_IA.items()}
    return r


def _intenta_crear(db: Session, m: MensajeBot, ia: dict[str, Any], semana: SemanaTecnico) -> registrosSchemma | None:
    """Con la lectura y el técnico ya puestos en `m`, crea el trabajo o deja el 🔴 en `m.estado`."""
    contratos = db.query(Trabajo).filter(Trabajo.nombre == m.tecnico).order_by(Trabajo.id).all()
    c = elegir_contrato(contratos, ia.get("job_type"))
    if not c:
        m.estado = "sin_contrato"
        return None
    fila = fila_desde_ia(ia, c)
    motivo = bloqueo(db, fila)
    if motivo:
        m.estado = motivo
        return None
    alertas = servicio_alertas.amarillas(db, fila, c, semana, ia)
    reg = registrosSchemma(semana_id=semana.id, origen="bot", validacion=POR_VALIDAR, mensaje_id=m.id,
                           alertas=json.dumps(alertas, ensure_ascii=False) if alertas else None, **fila)
    db.add(reg)
    db.flush()
    servicio_calculo.recalcula(db, reg)
    m.estado, m.registro_id = "creado", reg.id
    return reg


def crea_trabajos(db: Session, semana_label: str, mensajes: list[dict[str, Any]], tecnico_tanda: str | None = None,
                  tanda: str | None = None, lector: Lector | None = None) -> dict[str, Any]:
    """Procesa una tanda EN ORDEN. Un mensaje que es solo un nombre marca el técnico de los siguientes (B); un nombre
    en la primera línea gana para ese mensaje (C). Idempotente por `wamid`: un reintento de WhatsApp devuelve lo mismo.
    Devuelve {"resultados": [...], "tecnico_tanda": el técnico con el que queda la tanda, "tanda": id}."""
    lector = lector or _lector_por_defecto
    semana = asegura_semana(db, semana_label)
    nombres = nombres_tecnicos(db)
    tanda = tanda or uuid.uuid4().hex[:12]
    resultados = []
    for item in mensajes:
        texto = (item.get("texto") or "").strip()
        wamid = item.get("wamid")
        previo = db.query(MensajeBot).filter(MensajeBot.wamid == wamid).first() if wamid else None
        if previo:
            reg = db.get(registrosSchemma, previo.registro_id) if previo.registro_id else None
            resultados.append(_respuesta(previo, reg, repetido_whatsapp=True))
            continue
        quien = reconoce_tecnico(texto, nombres)
        if quien["solo_nombre"]:                   # B: «AFIK» marca la tanda, no es un trabajo
            if quien["nombre"]:
                tecnico_tanda = quien["nombre"]
            resultados.append({"wamid": wamid, "estado": "marca_tecnico", "tecnico": quien["nombre"],
                               "candidatos": quien["candidatos"]})
            continue
        m = MensajeBot(wamid=wamid, remitente=item.get("remitente"), texto=texto, semana=semana.semana,
                       tecnico=quien["nombre"] or tecnico_tanda, tanda=tanda, recibido=_fecha_iso(item.get("recibido")))
        db.add(m)
        db.flush()
        ia, uso = lector(texto)
        m.salida_ia = json.dumps(ia, ensure_ascii=False)
        m.modelo, m.version_prompt = uso.get("modelo"), uso.get("version_prompt")
        m.tokens_entrada, m.tokens_salida, m.costo_usd = uso.get("tokens_entrada"), uso.get("tokens_salida"), costo(uso)
        reg = None
        if not ia:
            m.estado = "sin_lectura"
        elif not m.tecnico:
            m.estado = "sin_tecnico"
        else:
            reg = _intenta_crear(db, m, ia, semana)
        db.flush()
        resultados.append(_respuesta(m, reg, candidatos=quien["candidatos"]))
    db.commit()
    return {"resultados": resultados, "tecnico_tanda": tecnico_tanda, "tanda": tanda, "semana": semana.semana}


def _fecha_iso(v: Any) -> datetime | None:
    if not v:
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(v))
    except ValueError:
        return None


def completa(db: Session, mensaje_id: int, cambios: dict[str, Any]) -> dict[str, Any]:
    """Completar un 🔴 (formulario o respuesta en el chat): se mezcla lo que faltaba con la lectura y se reintenta.
    `cambios` usa los nombres de la fila (tecnico, job, valor_servicio, valor_efectivo, valor_tarjeta, tipo_pago,
    partes_tecnico, partes_gil, tech, job_name)."""
    m = db.get(MensajeBot, mensaje_id)
    if not m:
        return {"estado": "no_existe"}
    if m.estado == "creado":
        return _respuesta(m, db.get(registrosSchemma, m.registro_id))
    ia = json.loads(m.salida_ia or "{}") or {}
    mapa = {"job": "job_type", "partes_tecnico": "parts_tecnico", "partes_gil": "parts_gil"}
    for k, v in cambios.items():
        if k == "tecnico":
            m.tecnico = _nombre_exacto(db, v) or m.tecnico
        elif v is not None and v != "":
            ia[mapa.get(k, k)] = v
    m.salida_ia = json.dumps(ia, ensure_ascii=False)
    semana = asegura_semana(db, m.semana)
    reg = _intenta_crear(db, m, ia, semana) if m.tecnico else None
    if not m.tecnico:
        m.estado = "sin_tecnico"
    db.commit()
    return _respuesta(m, reg)


# ─────────────────────────────── corregir desde el chat (§6, fase 6) ───────────────────────────────
CAMPOS_FILA = ["tecnico_id", "nombre", "job", "job_name", "valor_servicio", "valor_efectivo", "valor_tarjeta",
               "partes_tecnico", "partes_gil", "tech", "tipo_pago", "porcentaje_tecnico", "porcentaje_cc", "minimo",
               "adicional_dolar", "aplica_dolar_empresa", "dolar_adicional_empresa", "is_cash", "alertas", "total"]
CAMPOS_VISIBLES = {"valor_servicio": "valor", "tipo_pago": "pago", "valor_efectivo": "cash", "valor_tarjeta": "tarjeta",
                   "partes_tecnico": "partes técnico", "partes_gil": "partes Gil", "tech": "to tech", "job": "job",
                   "job_name": "número", "nombre": "técnico", "total": "total"}


def _foto(reg: registrosSchemma) -> dict[str, Any]:
    return {k: getattr(reg, k) for k in CAMPOS_FILA}


def corrige(db: Session, wamid: str, texto: str, lector: Lector | None = None) -> dict[str, Any]:
    """Se respondió CITANDO el mensaje de un trabajo («son 320 cash»). La IA vuelve a leer el mensaje original con la
    corrección al final (la corrección manda) y SOLO ese trabajo cambia. Devuelve también `antes`, para [Deshacer]."""
    m = db.query(MensajeBot).filter(MensajeBot.wamid == wamid).first() if wamid else None
    if not m or m.estado in ("borrado", "deshecho"):
        return {"estado": "no_es_trabajo"}
    reg = db.get(registrosSchemma, m.registro_id) if m.registro_id else None
    if reg is not None and reg.validacion != POR_VALIDAR:
        return {**_respuesta(m, reg), "estado": "ya_validado", "motivo": "Ya está validado: corrígelo en el panel."}
    quien = reconoce_tecnico(texto, nombres_tecnicos(db))
    lector = lector or _lector_por_defecto
    ia, uso = lector(f"{m.texto}\n\nCORRECCIÓN (lo que diga aquí manda sobre lo anterior): {texto}")
    m.tokens_entrada = (m.tokens_entrada or 0) + (uso.get("tokens_entrada") or 0)
    m.tokens_salida = (m.tokens_salida or 0) + (uso.get("tokens_salida") or 0)
    m.costo_usd = round((m.costo_usd or 0) + costo(uso), 6)
    if not ia:
        db.commit()
        return {**_respuesta(m, reg), "estado": "sin_lectura", "motivo": MOTIVOS["sin_lectura"]}
    previo = json.loads(m.salida_ia or "{}") or {}
    if not ia.get("job_name") and previo.get("job_name"):
        ia["job_name"] = previo["job_name"]
    if quien["nombre"]:
        m.tecnico = quien["nombre"]
    semana = asegura_semana(db, m.semana)
    if reg is None:                                   # era un 🔴: se reintenta con la lectura nueva
        m.salida_ia = json.dumps(ia, ensure_ascii=False)
        nuevo = _intenta_crear(db, m, ia, semana) if m.tecnico else None
        if not m.tecnico:
            m.estado = "sin_tecnico"
        db.commit()
        return _respuesta(m, nuevo)
    contratos = db.query(Trabajo).filter(Trabajo.nombre == m.tecnico).order_by(Trabajo.id).all()
    c = elegir_contrato(contratos, ia.get("job_type"))
    if not c:
        db.commit()
        return {**_respuesta(m, reg), "estado": "sin_contrato", "motivo": MOTIVOS["sin_contrato"]}
    fila = fila_desde_ia(ia, c)
    motivo = bloqueo(db, fila, excluir_id=reg.id)
    if motivo:                                        # la corrección dejaría el trabajo sin poder calcular: no se aplica
        db.commit()
        return {**_respuesta(m, reg), "estado": motivo, "motivo": MOTIVOS[motivo] + " No cambié nada."}
    antes = _foto(reg)
    alertas = servicio_alertas.amarillas(db, fila, c, semana, ia)
    for k, v in fila.items():
        setattr(reg, k, v)
    reg.alertas = json.dumps(alertas, ensure_ascii=False) if alertas else None
    servicio_calculo.recalcula(db, reg)
    m.salida_ia = json.dumps(ia, ensure_ascii=False)
    despues = _foto(reg)
    cambios = [{"campo": CAMPOS_VISIBLES[k], "antes": antes[k], "despues": despues[k]} for k in CAMPOS_VISIBLES
               if antes[k] != despues[k]]
    db.commit()
    return {**_respuesta(m, reg), "antes": antes, "cambios": cambios}


def restaura(db: Session, registro_id: int, antes: dict[str, Any]) -> dict[str, Any]:
    """[Deshacer] de una corrección: vuelve a lo de antes (solo si sigue por validar)."""
    reg = db.get(registrosSchemma, registro_id)
    if reg is None:
        return {"estado": "no_existe"}
    if reg.validacion != POR_VALIDAR:
        return {"estado": "ya_validado"}
    for k in CAMPOS_FILA:
        if k in antes:
            setattr(reg, k, antes[k])
    servicio_calculo.recalcula(db, reg)
    db.commit()
    return {"estado": "restaurado", "registro": servicio_calculo.fila_respuesta(reg)}


def _nombre_exacto(db: Session, nombre: str | None) -> str | None:
    por_norm = {_norm(n): n for n in nombres_tecnicos(db)}
    return por_norm.get(_norm(nombre))


# ─────────────────────────────── consultas y comandos (§8) ───────────────────────────────
def _semana_db(db: Session, label: str) -> SemanaTecnico | None:
    return db.query(SemanaTecnico).filter(SemanaTecnico.semana == label).first()


def resumen(db: Session, semana_label: str, tecnico: str | None = None) -> dict[str, Any]:
    """Por técnico: trabajos, ventas, saldo con Gil (la suma de los totales), cash/CC/MIXTO, por validar, con alertas."""
    sem = _semana_db(db, semana_label)
    if not sem:
        return {"semana": semana_label, "existe": False, "tecnicos": [], "bloqueados": 0}
    q = db.query(registrosSchemma).filter(registrosSchemma.semana_id == sem.id)
    if tecnico:
        q = q.filter(registrosSchemma.nombre == (_nombre_exacto(db, tecnico) or tecnico))
    por: dict[str, dict[str, Any]] = {}
    for r in q.all():
        t = por.setdefault(r.nombre, {"tecnico": r.nombre, "trabajos": 0, "ventas": 0.0, "saldo": 0.0, "cash": 0,
                                      "cc": 0, "mixto": 0, "por_validar": 0, "con_alertas": 0})
        t["trabajos"] += 1
        t["ventas"] += float(r.valor_servicio or 0)
        t["saldo"] += float(r.total or 0)
        tipo = (r.tipo_pago or "CASH").upper()
        t["mixto" if tipo == "MIXTO" else "cc" if tipo == "CC" else "cash"] += 1
        t["por_validar"] += r.validacion == POR_VALIDAR
        t["con_alertas"] += bool(r.alertas)
    for t in por.values():
        t["ventas"], t["saldo"] = calculo.formatear_numero(t["ventas"]), calculo.formatear_numero(t["saldo"])
    return {"semana": sem.semana, "existe": True, "estado": sem.estado or "abierta",
            "texto": texto_rango(sem.fecha_inicio), "tecnicos": sorted(por.values(), key=lambda x: x["tecnico"]),
            "bloqueados": len(bloqueados(db, sem.semana))}


def bloqueados(db: Session, semana_label: str) -> list[dict[str, Any]]:
    """Los 🔴 de la semana que siguen sin completar."""
    ms = (db.query(MensajeBot).filter(MensajeBot.semana == semana_label, MensajeBot.estado.in_(list(MOTIVOS)))
          .order_by(MensajeBot.id).all())
    return [_respuesta(m, texto=m.texto[:300]) for m in ms]


def pendientes(db: Session, semana_label: str) -> dict[str, Any]:
    sem = _semana_db(db, semana_label)
    filas = [] if not sem else (db.query(registrosSchemma)
                                .filter(registrosSchemma.semana_id == sem.id, registrosSchemma.validacion == POR_VALIDAR)
                                .order_by(registrosSchemma.id).all())
    return {"por_validar": [{**servicio_calculo.fila_respuesta(r), "nombre": r.nombre, "valor_servicio": r.valor_servicio,
                             "tipo_pago": r.tipo_pago, "alertas": json.loads(r.alertas) if r.alertas else []}
                            for r in filas],
            "bloqueados": bloqueados(db, semana_label)}


def buscar(db: Session, job: str) -> list[dict[str, Any]]:
    k = (job or "").strip().upper()
    if len(k) < 3:
        return []
    filas = (db.query(registrosSchemma).filter(func.upper(registrosSchemma.job_name).contains(k))
             .order_by(registrosSchemma.id.desc()).limit(10).all())
    return [{**servicio_calculo.fila_respuesta(r), "nombre": r.nombre, "valor_servicio": r.valor_servicio,
             "tipo_pago": r.tipo_pago, "semana": r.semana.semana if r.semana else None,
             "validacion": r.validacion} for r in filas]


def borra(db: Session, ids: list[int]) -> int:
    """Borra trabajos por id (el chat ya pidió confirmar). El mensaje del historial queda, marcado «borrado»."""
    regs = db.query(registrosSchemma).filter(registrosSchemma.id.in_(ids)).all()
    for r in regs:
        if r.mensaje_id:
            m = db.get(MensajeBot, r.mensaje_id)
            if m:
                m.estado = "borrado"
        db.delete(r)
    db.commit()
    return len(regs)


def deshace_tanda(db: Session, tanda: str) -> dict[str, int]:
    """«deshacer»: quita lo que entró en esa tanda y sigue por validar (lo ya aprobado en el panel no se toca)."""
    ms = db.query(MensajeBot).filter(MensajeBot.tanda == tanda).all()
    borrados, intactos = 0, 0
    for m in ms:
        reg = db.get(registrosSchemma, m.registro_id) if m.registro_id else None
        if reg is not None and reg.validacion != POR_VALIDAR:
            intactos += 1
            continue
        if reg is not None:
            db.delete(reg)
            borrados += 1
        m.estado = "deshecho"
    db.commit()
    return {"borrados": borrados, "ya_validados": intactos}


def notas_predeterminadas(c: Trabajo) -> list[str]:
    """Las mismas que siembra el panel (`procesarDatosTecnico`), con el mismo texto."""
    notas = [f"El minimo de este tecnico es de {_num_js(c.minimo)} dolares"]
    if (c.porcentaje_adicional_empresa or 0) != 0:
        notas.append(f"Este técnico tiene un porcentaje adicional para ciertos servicios de "
                     f"{_num_js(c.porcentaje_adicional_empresa)}$")
    if (c.cargo_sabados or 0) != 0:
        notas.append(f"Este técnico tiene un porcentaje diferente si el servicio lo realizo el dia sabado, el porcentaje "
                     f"es de {_num_js(c.cargo_sabados)}%")
    return notas


def agrega_nota(db: Session, semana_label: str, tecnico: str, texto: str) -> dict[str, Any] | None:
    """«nota afik …». Si el técnico aún no tiene notas esa semana, primero se siembran las de siempre (si no, el panel
    ya no las sembraría y se perderían)."""
    nombre = _nombre_exacto(db, tecnico)
    sem = asegura_semana(db, semana_label)
    if not nombre or not (texto or "").strip():
        return None
    existentes = db.query(NotaTecnico).filter(NotaTecnico.nombre == nombre, NotaTecnico.semana_id == sem.id).all()
    if not existentes:
        c = db.query(Trabajo).filter(Trabajo.nombre == nombre).order_by(Trabajo.id).first()
        for i, t in enumerate(notas_predeterminadas(c)):
            db.add(NotaTecnico(nombre=nombre, semana_id=sem.id, texto=t, orden=i))
        db.flush()
    orden = (db.query(func.max(NotaTecnico.orden)).filter(NotaTecnico.nombre == nombre,
                                                           NotaTecnico.semana_id == sem.id).scalar() or 0) + 1
    n = NotaTecnico(nombre=nombre, semana_id=sem.id, texto=texto.strip(), orden=orden)
    db.add(n)
    db.commit()
    return {"id": n.id, "tecnico": nombre, "texto": n.texto}


def cierra_semana(db: Session, semana_label: str) -> dict[str, Any]:
    """Cierre MANUAL (cualquier día). No cierra con 🔴 sin completar ni con trabajos por validar."""
    sem = _semana_db(db, semana_label)
    if not sem:
        return {"cerrada": False, "motivo": "Esa semana no tiene trabajos."}
    p = pendientes(db, semana_label)
    if p["bloqueados"] or p["por_validar"]:
        return {"cerrada": False, "bloqueados": len(p["bloqueados"]), "por_validar": len(p["por_validar"]),
                "motivo": "Hay trabajos sin completar o por validar."}
    sem.estado = "cerrada"
    db.commit()
    return {"cerrada": True, "semana": sem.semana}


# ─────────────────────────────── validar (el panel) ───────────────────────────────
CAMPOS_IA = {"job_name": "job_name", "valor_servicio": "valor_servicio", "valor_efectivo": "valor_efectivo",
             "valor_tarjeta": "valor_tarjeta", "partes_tecnico": "parts_tecnico", "partes_gil": "parts_gil",
             "tech": "tech", "tipo_pago": "tipo_pago", "job": "job_type"}


def valida(db: Session, ids: list[int]) -> int:
    """Aprobar en el panel. Al validar se guarda en el historial lo que quedó y qué campos corrigió una persona
    respecto a lo que leyó la IA (§9: acierto por campo)."""
    regs = db.query(registrosSchemma).filter(registrosSchemma.id.in_(ids), registrosSchemma.validacion == POR_VALIDAR).all()
    for r in regs:
        r.validacion = None
        m = db.get(MensajeBot, r.mensaje_id) if r.mensaje_id else None
        if m:
            ia = json.loads(m.salida_ia or "{}") or {}
            final = {k: getattr(r, k) for k in CAMPOS_IA} | {"total": r.total, "tecnico": r.nombre}
            corregidos = [k for k, kia in CAMPOS_IA.items() if not _mismo(final[k], ia.get(kia), k)]
            m.datos_finales = json.dumps(final, ensure_ascii=False, default=str)
            m.campos_corregidos = json.dumps(corregidos)
    db.commit()
    return len(regs)


def _mismo(final: Any, leido: Any, campo: str) -> bool:
    if campo in ("job_name", "tipo_pago", "job"):
        return _k(str(final or "")) == _k(str(leido or "")) or (campo == "job" and _k(str(final)) == "TODO")
    try:
        return float(final or 0) == float(leido or 0)
    except (TypeError, ValueError):
        return False


def nuevos(db: Session, nombre: str, semana_label: str, desde_id: int = 0) -> dict[str, int]:
    """Para el panel abierto: cuántos trabajos llegaron por WhatsApp después del último que vio."""
    sem = _semana_db(db, semana_label)
    if not sem:
        return {"nuevos": 0, "ultimo_id": desde_id}
    q = db.query(registrosSchemma.id).filter(registrosSchemma.semana_id == sem.id, registrosSchemma.nombre == nombre,
                                              registrosSchemma.origen == "bot", registrosSchemma.id > desde_id)
    ids = [i for (i,) in q.all()]
    return {"nuevos": len(ids), "ultimo_id": max(ids, default=desde_id)}


def gasto_ia(db: Session, desde: date | None = None, hasta: date | None = None) -> dict[str, Any]:
    q = db.query(func.count(MensajeBot.id), func.coalesce(func.sum(MensajeBot.tokens_entrada), 0),
                 func.coalesce(func.sum(MensajeBot.tokens_salida), 0), func.coalesce(func.sum(MensajeBot.costo_usd), 0))
    if desde:
        q = q.filter(MensajeBot.created_at >= datetime.combine(desde, datetime.min.time()))
    if hasta:
        q = q.filter(MensajeBot.created_at < datetime.combine(hasta + timedelta(days=1), datetime.min.time()))
    n, te, ts, usd = q.one()
    return {"mensajes": n, "tokens_entrada": int(te), "tokens_salida": int(ts), "costo_usd": round(float(usd), 4)}


# ─────────────────────────────── para los paneles de GAELA (fase 7) ───────────────────────────────
def _pago(r: registrosSchemma) -> str:
    t = (r.tipo_pago or "CASH").upper()
    return "mixto" if t == "MIXTO" else "cc" if t == "CC" else "cash"


def semanas_con_totales(db: Session, n: int = 12) -> list[dict[str, Any]]:
    """Las últimas n semanas con sus totales (Semana → «Semanas anteriores» y la línea de Métricas)."""
    sems = db.query(SemanaTecnico).order_by(SemanaTecnico.fecha_inicio.desc()).limit(n).all()
    out = []
    for s in sems:
        trab, ventas, saldo, tecnicos, validar = db.query(
            func.count(registrosSchemma.id), func.coalesce(func.sum(registrosSchemma.valor_servicio), 0),
            func.coalesce(func.sum(registrosSchemma.total), 0), func.count(func.distinct(registrosSchemma.nombre)),
            func.count(registrosSchemma.validacion)).filter(registrosSchemma.semana_id == s.id).one()
        out.append({"semana": s.semana, "texto": texto_rango(s.fecha_inicio), "fecha_inicio": s.fecha_inicio.isoformat(),
                    "estado": s.estado or "abierta", "trabajos": trab, "tecnicos": tecnicos, "por_validar": validar,
                    "ventas": calculo.formatear_numero(float(ventas)), "saldo": calculo.formatear_numero(float(saldo))})
    return out


def metricas(db: Session, n: int = 6) -> dict[str, Any]:
    """Métricas de técnicos de las últimas n semanas, con lo ya validado (lo que espera validación no cuenta)."""
    sems = db.query(SemanaTecnico).order_by(SemanaTecnico.fecha_inicio.desc()).limit(n).all()
    ids = [s.id for s in sems]
    regs = [] if not ids else db.query(registrosSchemma).filter(
        registrosSchemma.semana_id.in_(ids), registrosSchemma.validacion.is_(None)).all()
    por: dict[str, dict[str, Any]] = {}
    pagos = {"cash": 0, "cc": 0, "mixto": 0}
    comision = 0.0
    for r in regs:
        t = por.setdefault(r.nombre, {"tecnico": r.nombre, "trabajos": 0, "ventas": 0.0, "partes": 0.0, "saldo": 0.0,
                                      "jobs": {}})
        t["trabajos"] += 1
        t["ventas"] += float(r.valor_servicio or 0)
        t["partes"] += float(r.partes_tecnico or 0) + float(r.partes_gil or 0)
        t["saldo"] += float(r.total or 0)
        t["jobs"][r.job or "—"] = t["jobs"].get(r.job or "—", 0) + 1
        pagos[_pago(r)] += 1
        comision += float(r.porcentaje_cc or 0)
    tecnicos = []
    for t in por.values():
        tecnicos.append({"tecnico": t["tecnico"], "trabajos": t["trabajos"],
                         "ventas": calculo.formatear_numero(t["ventas"]),
                         "promedio": calculo.formatear_numero(t["ventas"] / t["trabajos"]),
                         "partes": calculo.formatear_numero(t["partes"]), "saldo": calculo.formatear_numero(t["saldo"]),
                         "mas_hace": max(t["jobs"], key=t["jobs"].get)})
    semanas = [s for s in semanas_con_totales(db, n)]
    semanas.reverse()   # de la más vieja a la más nueva, para la línea
    return {"semanas": semanas, "tecnicos": sorted(tecnicos, key=lambda x: -x["ventas"]), "pagos": pagos,
            "comision_tarjeta": calculo.formatear_numero(comision)}


def semana_por_tecnico(db: Session, semana_label: str) -> dict[str, Any]:
    """«Esta semana»: el resumen de cada técnico + cuántos pagos de cada tipo (para su barrita) + los 🔴."""
    r = resumen(db, semana_label)
    return {**r, "bloqueados_lista": bloqueados(db, semana_label) if r.get("existe") else []}


# ─────────────────────────────── Excel por enlace ───────────────────────────────
def excel(db: Session, nombre: str, semana_label: str):
    """El MISMO Excel del panel (`exporToExcelController`) con todos los trabajos del técnico en esa semana."""
    sem = _semana_db(db, semana_label)
    if not sem:
        return None
    ids = [i for (i,) in db.query(registrosSchemma.id).filter(registrosSchemma.semana_id == sem.id,
                                                               registrosSchemma.nombre == nombre).all()]
    if not ids:
        return None
    return exporToExcelController([SimpleNamespace(id_registro=i) for i in ids], nombre, semana_label, db)


def tecnicos_de_semana(db: Session, semana_label: str) -> list[str]:
    sem = _semana_db(db, semana_label)
    if not sem:
        return []
    return sorted({n for (n,) in db.query(registrosSchemma.nombre).filter(registrosSchemma.semana_id == sem.id).all()})
