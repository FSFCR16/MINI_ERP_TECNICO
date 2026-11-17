"""
Prepara la base para el plan del bot (fases 1, 2 y 3). Se corre UNA vez en el servidor, ANTES de publicar el código nuevo:

    .venv/Scripts/python.exe migrar_bot.py

Idempotente (se puede correr dos veces sin daño): agrega columnas con IF NOT EXISTS y crea solo las tablas que faltan.
No borra ni cambia ningún dato. Usa la base del .env (la de producción en el servidor).
"""

from sqlalchemy import inspect, text

from app.db import Base, engine
import app.models  # noqa: F401
import app.models_bot  # noqa: F401
import app.models_notas  # noqa: F401
import app.models_virginia  # noqa: F401

COLUMNAS = {   # registros_semanas: lo que la fórmula usa (fase 2) y de dónde vino el trabajo
    "is_cash": "BOOLEAN", "aplica_dolar_empresa": "VARCHAR(2)", "adicional_dolar": "DOUBLE PRECISION",
    "minimo": "DOUBLE PRECISION", "dolar_adicional_empresa": "DOUBLE PRECISION", "origen": "VARCHAR(20)",
    # fase 3: lo que llega por WhatsApp entra por validar, con sus alertas y el mensaje del que salió
    "validacion": "VARCHAR(20)", "alertas": "TEXT", "mensaje_id": "INTEGER",
}


def main() -> None:
    existentes = {c["name"] for c in inspect(engine).get_columns("registros_semanas")}
    with engine.begin() as con:
        for nombre, tipo in COLUMNAS.items():
            if nombre not in existentes:
                con.execute(text(f"ALTER TABLE registros_semanas ADD COLUMN {nombre} {tipo}"))
                print(f"✓ registros_semanas.{nombre}")
    Base.metadata.create_all(bind=engine)   # solo crea las tablas nuevas (usuarios_erp, diferencias_calculo, mensajes_bot)
    # D-382: «Lo que leyó distinto» se marca como revisado; una palabra del vocabulario existe UNA vez; y las palabras
    # que estaban escritas en el prompt pasan al vocabulario (una sola vez).
    if "revisado_at" not in {c["name"] for c in inspect(engine).get_columns("mensajes_bot")}:
        with engine.begin() as con:
            con.execute(text("ALTER TABLE mensajes_bot ADD COLUMN revisado_at TIMESTAMP WITH TIME ZONE"))
        print("✓ mensajes_bot.revisado_at")
    with engine.begin() as con:
        con.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS vocabulario_ia_palabra_uq ON vocabulario_ia (palabra)"))
    from app import vocabulario
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        n = vocabulario.siembra_base(db)
    finally:
        db.close()
    if n:
        print(f"✓ vocabulario: {n} palabras base")
    print("✓ base lista para el bot")


if __name__ == "__main__":
    main()
