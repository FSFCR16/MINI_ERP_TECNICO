from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.db import SessionLocal,Base, engine
from dotenv import load_dotenv
from app import models
import os

Base.metadata.create_all(bind=engine)

# Cargar el archivo .env
load_dotenv()

URLFRONT = os.getenv("URLFRONT")

### CREACION CONSTRUTOR FAST API
app = FastAPI()

origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=[origins], allow_credentials=True, 
                   allow_methods=["*"], allow_headers=["*"])

### RUTAS 
app.include_router(router)