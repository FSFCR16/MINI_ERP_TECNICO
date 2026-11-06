"""
Las tablas del plan del bot (PLAN_BOT_CHAT.md):
- `usuarios_erp`: quién puede entrar al panel (fase 1, seguridad). La clave se guarda con PBKDF2, nunca en claro.
- `diferencias_calculo`: fase 2, cuando el panel y el servidor no dan el mismo total.
- `mensajes_bot`: fase 3, el historial de cada mensaje que llegó por WhatsApp (para mejorar la IA y medir su gasto).
"""

from sqlalchemy import TIMESTAMP, Boolean, Column, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.db import Base


class UsuarioERP(Base):
    __tablename__ = "usuarios_erp"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(200), nullable=False, unique=True, index=True)
    nombre = Column(String(120), nullable=False)
    clave_hash = Column(String(300), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class DiferenciaCalculo(Base):
    """Fase 2: cada vez que el total del panel y el del servidor NO coinciden. Debería quedar vacía (las dos fórmulas
    son la misma y lo vigila `tests/test_calculo_paridad.py`); si aparece una, es un error de una de las dos y ese caso
    pasa a ser una prueba nueva."""

    __tablename__ = "diferencias_calculo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    registro_id = Column(Integer, nullable=True, index=True)
    total_panel = Column(Float, nullable=True)
    total_servidor = Column(Float, nullable=True)
    entrada = Column(Text, nullable=False)          # JSON con todo lo que usó la fórmula
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class MensajeBot(Base):
    """Fase 3 · §9 del plan: una fila por mensaje reenviado al bot. Guarda lo que llegó, lo que leyó la IA (con su gasto)
    y, al validar en el panel, lo que quedó de verdad y qué campos hubo que corregir: con eso se mide el acierto por
    campo y se prueban cambios de prompt sin empeorar. ⚠️ El texto trae datos de clientes (nombre, teléfono,
    dirección): cuánto tiempo se guarda está PENDIENTE de decidir con el dueño."""

    __tablename__ = "mensajes_bot"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wamid = Column(String(200), nullable=True, unique=True, index=True)   # id de WhatsApp: un reintento no duplica
    remitente = Column(String(60), nullable=True)
    recibido = Column(TIMESTAMP(timezone=True), nullable=True)
    texto = Column(Text, nullable=False)
    semana = Column(String(50), nullable=True, index=True)
    tecnico = Column(String(120), nullable=True)
    tanda = Column(String(60), nullable=True, index=True)                 # para «deshacer» la última tanda
    salida_ia = Column(Text, nullable=True)                               # JSON tal cual lo devolvió la IA
    modelo = Column(String(60), nullable=True)
    version_prompt = Column(String(20), nullable=True)
    tokens_entrada = Column(Integer, nullable=True)
    tokens_salida = Column(Integer, nullable=True)
    costo_usd = Column(Float, nullable=True)
    estado = Column(String(30), nullable=False, default="recibido")       # creado · sin_tecnico · sin_contrato · …
    registro_id = Column(Integer, nullable=True, index=True)
    datos_finales = Column(Text, nullable=True)                           # JSON al validar
    campos_corregidos = Column(Text, nullable=True)                       # JSON: lista de campos que cambió una persona
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)


class PaseUsado(Base):
    """Los pases de «Abrir el ERP» ya canjeados: así cada uno sirve UNA vez (aunque el servidor tenga varias copias)."""

    __tablename__ = "pases_usados"

    jti = Column(String(40), primary_key=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
