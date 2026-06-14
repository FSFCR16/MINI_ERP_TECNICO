"""
Schemas pydantic del módulo VIRGINIA. Independientes de `schemmas.py`.
"""
from pydantic import BaseModel, field_validator
from datetime import date
from typing import Optional, List


# ──────────────────────────────────────────────
#  TÉCNICO (persona)
# ──────────────────────────────────────────────
class TecnicoVirginiaCreate(BaseModel):
    nombre: str
    valor_adicional: float = 2.5


class TecnicoVirginiaUpdate(BaseModel):
    nombre: Optional[str] = None
    valor_adicional: Optional[float] = None


class TecnicoVirginiaSchema(BaseModel):
    id: int
    nombre: str
    valor_adicional: float

    class Config:
        orm_mode = True


# ──────────────────────────────────────────────
#  CONFIG por job
# ──────────────────────────────────────────────
class ConfigVirginiaCreate(BaseModel):
    tecnico_virginia_id: int
    job: str
    porcentaje_tecnico: float
    minimo: float = 0
    cargo_sabados: float = 0
    porcentaje_adicional_empresa: float = 0


class ConfigVirginiaUpdate(BaseModel):
    job: Optional[str] = None
    porcentaje_tecnico: Optional[float] = None
    porcentaje_gil: Optional[float] = None
    minimo: Optional[float] = None
    cargo_sabados: Optional[float] = None
    porcentaje_adicional_empresa: Optional[float] = None


class ConfigVirginiaSchema(BaseModel):
    id: int
    tecnico_virginia_id: int
    job: str
    porcentaje_tecnico: Optional[float] = None
    porcentaje_gil: Optional[float] = None
    minimo: Optional[float] = None
    cargo_sabados: Optional[float] = None
    porcentaje_adicional_empresa: Optional[float] = None

    class Config:
        orm_mode = True


# ──────────────────────────────────────────────
#  MÉTODO DE PAGO
# ──────────────────────────────────────────────
class MetodoPagoVirginiaCreate(BaseModel):
    tecnico_virginia_id: int
    nombre: str
    trato: str          # 'CASH' o 'CC'
    principal: bool = False

    @field_validator("trato")
    @classmethod
    def validar_trato(cls, v):
        if v not in ("CASH", "CC"):
            raise ValueError("trato debe ser 'CASH' o 'CC'")
        return v


class MetodoPagoVirginiaUpdate(BaseModel):
    nombre: Optional[str] = None
    trato: Optional[str] = None
    principal: Optional[bool] = None

    @field_validator("trato")
    @classmethod
    def validar_trato(cls, v):
        if v is not None and v not in ("CASH", "CC"):
            raise ValueError("trato debe ser 'CASH' o 'CC'")
        return v


class MetodoPagoVirginiaSchema(BaseModel):
    id: int
    tecnico_virginia_id: int
    nombre: str
    trato: str
    principal: bool

    class Config:
        orm_mode = True


# ──────────────────────────────────────────────
#  SEMANA
# ──────────────────────────────────────────────
class SemanaVirginiaBody(BaseModel):
    semana: Optional[str] = None  # si viene None, usa la actual


class SemanaVirginiaSchema(BaseModel):
    id: int
    year_num: int
    numero_semana: int
    semana: str
    fecha_inicio: date
    fecha_fin: date
    estado: str

    class Config:
        orm_mode = True


class SemanaVirginiaRequest(BaseModel):
    semana_id: int


class EliminarTecnicoVirginiaRequest(BaseModel):
    nombre: str
    semana_id: int


# ──────────────────────────────────────────────
#  REGISTROS
# ──────────────────────────────────────────────
class RegistroVirginiaFront(BaseModel):
    """Lo que el frontend envía/recibe por registro (total ya calculado en el cliente)."""
    id: str
    id_tecnico: int
    id_registro: Optional[int] = None
    nombre: str
    job: str
    job_name: str
    valor_servicio: float
    metodo_pago: Optional[str] = None
    tipo_pago: str
    valor_tarjeta: float = 0
    valor_efectivo: float = 0
    porcentaje_tecnico: float = 0
    participacion: float = 100
    subtotal: float = 0
    total: float = 0

    @field_validator("id", mode="before")
    @classmethod
    def id_to_str(cls, v):
        return str(v)

    class Config:
        orm_mode = True


class EnvioRegistrosVirginiaBody(BaseModel):
    semana: str
    registros: List[RegistroVirginiaFront]


class UpdateRegistroVirginiaSchema(BaseModel):
    id: Optional[int] = None
    job: Optional[str] = None
    job_name: Optional[str] = None
    valor_servicio: Optional[float] = None
    metodo_pago: Optional[str] = None
    tipo_pago: Optional[str] = None
    valor_efectivo: Optional[float] = None
    valor_tarjeta: Optional[float] = None
    porcentaje_tecnico: Optional[float] = None
    participacion: Optional[float] = None
    subtotal: Optional[float] = None
    total: Optional[float] = None


# ──────────────────────────────────────────────
#  PARTES
# ──────────────────────────────────────────────
class ParteVirginiaCreate(BaseModel):
    tecnico_virginia_id: int
    semana: str
    job: str
    valor: float
    porcentaje_tecnico: Optional[float] = None


class ParteVirginiaSchema(BaseModel):
    id: int
    tecnico_virginia_id: int
    semana_virginia_id: int
    job: Optional[str] = None
    valor: float
    porcentaje_tecnico: Optional[float] = None

    class Config:
        orm_mode = True
