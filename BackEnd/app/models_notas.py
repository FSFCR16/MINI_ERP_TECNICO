"""
Modelos de NOTAS — aditivos, no tocan ninguna tabla existente.
Una nota vive por (técnico, semana). Sin relationships para no acoplar con los
otros modelos: las FK se resuelven por nombre de tabla en el mismo Base.metadata.

Rollback: DROP TABLE notas_tecnico, notas_virginia.
"""
from sqlalchemy import Column, TIMESTAMP, Integer, String, ForeignKey
from sqlalchemy.sql import func
from app.db import Base


class NotaTecnico(Base):
    """Notas del módulo GENERAL. Se identifica por nombre del técnico + semana."""
    __tablename__ = "notas_tecnico"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    semana_id = Column(Integer, ForeignKey("semanas_tecnico.id", ondelete="CASCADE"), nullable=False)
    texto = Column(String, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class NotaVirginia(Base):
    """Notas del módulo VIRGINIA. Se identifica por técnico + semana."""
    __tablename__ = "notas_virginia"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tecnico_virginia_id = Column(Integer, ForeignKey("tecnicos_virginia.id", ondelete="CASCADE"), nullable=False)
    semana_virginia_id = Column(Integer, ForeignKey("semanas_virginia.id", ondelete="CASCADE"), nullable=False)
    texto = Column(String, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
