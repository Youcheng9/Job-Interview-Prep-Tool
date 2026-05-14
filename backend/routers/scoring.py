from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import User
from backend.schemas.scoring import SubmitAnswerRequest, SubmitAnswerResponse
from backend.services.scoring_service import ScoringService
from backend.dependencies import get_current_user

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    payload: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return ScoringService(db).submit_answer(
        payload=payload,
        user=user,
    )
