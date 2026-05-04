from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import User
from backend.schemas.scoring import (
    GenerateAIFeedbackResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from backend.services.scoring_service import ScoringService
from backend.dependencies import get_current_user

router = APIRouter(prefix="/scoring", tags=["scoring"])

@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    payload: SubmitAnswerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return ScoringService(db).submit_answer(
        payload=payload,
        user=user,
        background_tasks=background_tasks,
    )


@router.post("/{answer_id}/ai-feedback", response_model=GenerateAIFeedbackResponse)
def generate_ai_feedback_for_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return ScoringService(db).generate_ai_feedback_for_answer(answer_id=answer_id, user=user)
