from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="InterviewPrep API")

# react dev server (5173 for Vite, 3000 for CRA)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins = [
        "http://localhost:3000", # Allow React app's origin
        "http://localhost:5173" # if using Vite
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
    
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Import and include the questions router
from .routers.questions import router as questions_router

app.include_router(questions_router)