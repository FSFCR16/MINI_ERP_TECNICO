from fastapi import FastAPI,Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.db import SessionLocal, Base, engine
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import os
import traceback

# Cargar el archivo .env
load_dotenv()

URLFRONT = os.getenv("URLFRONT")

### CREACION CONSTRUTOR FAST API
app = FastAPI()


#Base.metadata.create_all(bind=engine)


origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, 
                   allow_methods=["*"], allow_headers=["*"])

### RUTAS 
app.include_router(router)

### MANEJO DE ERRORES
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):

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