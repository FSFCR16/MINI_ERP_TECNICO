from sqlalchemy import Column, TIMESTAMP ,Integer, String, Float, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base
from sqlalchemy.sql import func
from datetime import date, datetime, timezone

class Trabajo(Base):
    __tablename__ = "tecnicos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    job = Column(String, nullable=True)
    porcentaje_tecnico = Column(Float, nullable=True)
    porcentaje_gil = Column(Float, nullable=True)
    adicional_dolar = Column(Float, nullable=True)
    minimo = Column(Float, nullable=True)
    porcentaje_cc = Column(Float, nullable=True)
    cargo_sabados = Column(Float, nullable=True)
    porcentaje_adicional_empresa = Column(Float, nullable=True)

    registros= relationship("registrosSchemma", back_populates="tecnico")

    __table_args__ = (
        UniqueConstraint('job', 'nombre', name='uq_tecnico_semana'),
    )
    
class registrosSchemma(Base):
    __tablename__ = "registros_semanas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_id = Column(Integer, ForeignKey("tecnicos.id",ondelete="CASCADE"), nullable=False)
    semana_id = Column(
        Integer,
        ForeignKey("semanas_tecnico.id", ondelete="CASCADE"),
        nullable=False
    )
    nombre = Column(String, nullable=False)
    job = Column(String, nullable=True)
    job_name = Column(String, nullable=True)
    valor_servicio = Column(Float, nullable=True)
    tipo_pago = Column(String, nullable=True)
    valor_tarjeta = Column(Float, nullable=True)
    valor_efectivo=Column(Float, nullable=True)
    partes_gil = Column(Float, nullable=True)
    partes_tecnico = Column(Float, nullable=True)
    tech = Column(Float, nullable=True)
    porcentaje_tecnico = Column(Float, nullable=True)
    porcentaje_cc = Column(Float, nullable=True)
    subtotal = Column(Float, nullable=True)
    total = Column(Float, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True),server_default=func.now(),default=lambda: datetime.now(timezone.utc),nullable=False) # 👈 no más nulls
    tecnico= relationship("Trabajo", back_populates="registros")
    semana = relationship("SemanaTecnico", back_populates="registros")


class SemanaTecnico(Base):
    __tablename__ = "semanas_tecnico"

    id = Column(Integer, primary_key=True, index=True)
    year_num = Column(Integer, nullable=False)
    numero_semana = Column(Integer, nullable=False)

    semana = Column(String(50), nullable=False)  # ejemplo: 2026_semana_7

    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)

    estado = Column(String(20), default="abierta")

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # 🔥 evita duplicados por técnico y semana
    __table_args__ = (
        UniqueConstraint("year_num", "numero_semana", name="unique_semana_tecnico"),
    )

    # 🔹 Relaciones (opcional pero recomendado)
    registros = relationship("registrosSchemma", back_populates="semana", cascade="all, delete-orphan")