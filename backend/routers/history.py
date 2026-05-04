# backend/routers/history.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.models.db import get_db
from backend.models.models import User
from backend.dependencies import get_current_user
from backend.schemas.history import HistoryResponse
from backend.services.history_service import HistoryService

router = APIRouter(prefix="/history", tags=["history"])

@router.get("", response_model=HistoryResponse)
def get_history(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return HistoryService(db).get_history(user=user, limit=limit)
