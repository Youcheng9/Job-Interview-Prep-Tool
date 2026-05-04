from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from backend.routers.dbcheck import router as db_router
from backend.routers.scoring import router as scoring_router
from backend.routers.auth import router as auth_router
from backend.routers.history import router as history_router
from backend.ml.embedder import warm_model

app = FastAPI(title="InterviewPrep API")

default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]
configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=configured_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
    
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Import and include the questions router
from .routers.questions import router as questions_router

app.include_router(questions_router)

app.include_router(db_router)

app.include_router(scoring_router)

app.include_router(auth_router)

app.include_router(history_router)


@app.on_event("startup")
def warm_embedding_model() -> None:
    try:
        warm_model()
    except Exception:
        pass
