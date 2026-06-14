"""
Modelos del módulo VIRGINIA — totalmente independientes del flujo general.
No comparten tablas con `models.py`. Cualquier cambio aquí no afecta a los técnicos generales.
"""
from sqlalchemy import (
    Column, TIMESTAMP, Integer, String, Float, Boolean, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from app.db import Base


class TecnicoVirginia(Base):
    """La persona. El `valor_adicional` vive a este nivel (aplica a todos sus jobs)."""
    __tablename__ = "tecnicos_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False, unique=True)
    valor_adicional = Column(Float, nullable=False, default=2.5)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    configs = relationship(
        "ConfigVirginia",
        back_populates="tecnico",
        cascade="all, delete-orphan",
    )
    metodos_pago = relationship(
        "MetodoPagoVirginia",
        back_populates="tecnico",
        cascade="all, delete-orphan",
    )
    registros = relationship(
        "RegistroVirginia",
        back_populates="tecnico",
        cascade="all, delete-orphan",
    )
    partes = relationship(
        "ParteVirginia",
        back_populates="tecnico",
        cascade="all, delete-orphan",
    )


class ConfigVirginia(Base):
    """Configuración por tipo de job de un técnico Virginia."""
    __tablename__ = "config_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_virginia_id = Column(
        Integer, ForeignKey("tecnicos_virginia.id", ondelete="CASCADE"), nullable=False
    )
    job = Column(String, nullable=False)  # LOCKOUT / CAR KEY / PVT JOBS / TODO
    porcentaje_tecnico = Column(Float, nullable=True)
    porcentaje_gil = Column(Float, nullable=True)  # = 100 - porcentaje_tecnico
    minimo = Column(Float, nullable=True)
    cargo_sabados = Column(Float, nullable=True)
    porcentaje_adicional_empresa = Column(Float, nullable=True)

    tecnico = relationship("TecnicoVirginia", back_populates="configs")

    __table_args__ = (
        UniqueConstraint("tecnico_virginia_id", "job", name="uq_virginia_tecnico_job"),
    )


class MetodoPagoVirginia(Base):
    """Método de pago de un técnico. `trato` define si se calcula como CASH o CC."""
    __tablename__ = "metodos_pago_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_virginia_id = Column(
        Integer, ForeignKey("tecnicos_virginia.id", ondelete="CASCADE"), nullable=False
    )
    nombre = Column(String, nullable=False)        # ej: Zelle, Cash, Visa
    trato = Column(String, nullable=False)         # 'CASH' o 'CC'
    principal = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    tecnico = relationship("TecnicoVirginia", back_populates="metodos_pago")


class SemanaVirginia(Base):
    """Semanas propias de Virginia (independientes de `semanas_tecnico`)."""
    __tablename__ = "semanas_virginia"

    id = Column(Integer, primary_key=True, index=True)
    year_num = Column(Integer, nullable=False)
    numero_semana = Column(Integer, nullable=False)
    semana = Column(String(50), nullable=False)  # ej: 2026_06_semana_24
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    estado = Column(String(20), default="abierta")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    registros = relationship(
        "RegistroVirginia",
        back_populates="semana",
        cascade="all, delete-orphan",
    )
    partes = relationship(
        "ParteVirginia",
        back_populates="semana",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("year_num", "numero_semana", name="uq_virginia_semana"),
    )


class RegistroVirginia(Base):
    """Servicio cargado en una semana. Sin partes/tech/%cc (esos no aplican a Virginia)."""
    __tablename__ = "registros_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_virginia_id = Column(
        Integer, ForeignKey("tecnicos_virginia.id", ondelete="CASCADE"), nullable=False
    )
    semana_virginia_id = Column(
        Integer, ForeignKey("semanas_virginia.id", ondelete="CASCADE"), nullable=False
    )
    nombre = Column(String, nullable=False)
    job = Column(String, nullable=True)
    job_name = Column(String, nullable=True)
    valor_servicio = Column(Float, nullable=True)
    metodo_pago = Column(String, nullable=True)    # nombre del método usado
    tipo_pago = Column(String, nullable=True)      # trato efectivo: CASH / CC / MIXTO
    valor_efectivo = Column(Float, nullable=True)
    valor_tarjeta = Column(Float, nullable=True)
    porcentaje_tecnico = Column(Float, nullable=True)
    participacion = Column(Float, nullable=False, default=100)  # % propio (trabajo compartido); 100 = job completo
    subtotal = Column(Float, nullable=True)
    total = Column(Float, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    tecnico = relationship("TecnicoVirginia", back_populates="registros")
    semana = relationship("SemanaVirginia", back_populates="registros")


class ParteVirginia(Base):
    """
    Line items de partes (se cargan al final con el botón 'Agregar partes').
    Se acumulan en una sola fila 'parts' en el Excel. Solo afectan el BALANCED TECH.
    """
    __tablename__ = "partes_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_virginia_id = Column(
        Integer, ForeignKey("tecnicos_virginia.id", ondelete="CASCADE"), nullable=False
    )
    semana_virginia_id = Column(
        Integer, ForeignKey("semanas_virginia.id", ondelete="CASCADE"), nullable=False
    )
    job = Column(String, nullable=True)            # job elegido al agregar (define el %)
    valor = Column(Float, nullable=False)
    porcentaje_tecnico = Column(Float, nullable=True)  # snapshot del % del job
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    tecnico = relationship("TecnicoVirginia", back_populates="partes")
    semana = relationship("SemanaVirginia", back_populates="partes")
