from fastapi import FastAPI,Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.routes_virginia import router as router_virginia
from app.routes_notas import router as router_notas
from app.routes_auth import router as router_auth
from app.routes_bot import router as router_bot, router_publico as router_bot_publico
from app.db import SessionLocal, Base, engine
from app import seguridad
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import os
import traceback

# Cargar el archivo .env
load_dotenv()

URLFRONT = os.getenv("URLFRONT")

# Plan del bot, fase 1: sin ERP_SECRETO no se arranca (mejor caído que abierto).
seguridad._secreto()



def es_local(url_base: str | None, en_render: str | None) -> bool:
    """Seguridad E6 (2026-11-11): ¿corre en el PC? Solo si NO está en Render (que siempre pone RENDER) y la base es
    SQLite o un Postgres en localhost (dev_local.py y las pruebas). Ante la duda, se trata como producción."""
    if en_render:
        return False
    url = (url_base or "").strip().lower()
    if url.startswith("sqlite"):
        return True
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname in ("localhost", "127.0.0.1")
    except ValueError:
        return False


# Seguridad E6 (2026-11-11): /docs, /redoc y /openapi.json solo en local; en producción no se publican.
_LOCAL = es_local(os.getenv("POSTGRES_URL"), os.getenv("RENDER"))

### CREACION CONSTRUTOR FAST API
app = FastAPI(docs_url="/docs" if _LOCAL else None, redoc_url="/redoc" if _LOCAL else None,
              openapi_url="/openapi.json" if _LOCAL else None)


#Base.metadata.create_all(bind=engine)


# Plan del bot, fase 1: CORS solo para el panel (ERP_ORIGENES, separados por coma; si no, URLFRONT). Antes: «*».
origins = [o.strip().rstrip("/") for o in (os.getenv("ERP_ORIGENES") or URLFRONT or "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
                   allow_headers=["Authorization", "Content-Type", "X-Llave-Chat"])

### RUTAS
# Plan del bot, fase 1: TODA la API pide sesión (o la llave del chat). Lo único abierto: entrar.
app.include_router(router_auth)
app.include_router(router, dependencies=seguridad.ACCESO)
app.include_router(router_virginia, dependencies=seguridad.ACCESO)
app.include_router(router_notas, dependencies=seguridad.ACCESO)
app.include_router(router_bot, dependencies=seguridad.ACCESO)
app.include_router(router_bot_publico)          # solo el Excel por enlace firmado (lleva su propia firma)

### MANEJO DE ERRORES
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Seguridad E7 (2026-11-11): un 500 no le muestra al navegador el texto de la excepción (nombres de tablas, SQL,
    # rutas…). El detalle se queda en los logs del servidor; el cliente ve un mensaje genérico.
    if exc.status_code == 500:
        print(f"ERROR 500 en {request.method} {request.url.path}: {exc.detail}")
        if exc.__context__ is not None:
            traceback.print_exception(type(exc.__context__), exc.__context__, exc.__context__.__traceback__)
        return JSONResponse(status_code=500, content={"success": False, "error": "Error interno del servidor"})

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):

    print("ERROR INTERNO:")
    traceback.print_exc()  # ← imprime el error real en los logs

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Error interno del servidor"
        }
    )