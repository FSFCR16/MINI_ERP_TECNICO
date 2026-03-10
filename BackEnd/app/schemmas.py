from pydantic import BaseModel
from datetime import date
from typing import Optional


class TecnicoRequest(BaseModel):
    nombre: str

class TrabajoSchema(BaseModel):

    id: int
    nombre: str
    job: str | None = None
    porcentaje_tecnico: float | None = None
    porcentaje_gil: float | None = None
    adicional_dolar: float | None = None
    minimo: float | None = None
    porcentaje_cc: float | None = None
    cargo_sabados: float | None = None
    porcentaje_adicional_empresa: float | None = None

    class Config:
        orm_mode = True


class SemanaTecnicoSchema(BaseModel):
    id: int

    year_num: int
    numero_semana: int
    semana: str

    fecha_inicio: date
    fecha_fin: date
    estado: str

    class Config:
        orm_mode = True


class SemanaTecnicoSchemaFront(BaseModel):
    id:str
    id_tecnico: int
    id_registro: Optional[int] = None
    nombre: str
    job: str
    job_name: str
    valor_servicio: float
    porcentaje_tecnico: float
    minimo: float
    opciones_pago:list
    tipo_pago: str
    valor_tarjeta: float
    valor_efectivo: float
    porcentaje_cc: float
    partes_gil: float
    partes_tecnico: float
    tech: float
    subtotal: float
    total: float
    adicional_dolar:float
    notas: list
    class Config:
        orm_mode = True

class ResumenSemanaSchema(BaseModel):
    nombre: str
    semana_id: int
    semana: str
    fecha_inicio: date
    fecha_fin: date
    total_registros: int

class SemanaRequest(BaseModel):
    semana_id: int

