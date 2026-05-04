from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user
from backend.models.db import get_db
from backend.models.models import User
from backend.schemas.feedback_chat import (
    CreateFeedbackChatMessageRequest,
    CreateFeedbackChatMessageResponse,
    FeedbackChatThreadResponse,
)
from backend.services.feedback_chat_service import FeedbackChatService

router = APIRouter(prefix="/feedback-chat", tags=["feedback-chat"])


@router.get("/answers/{answer_id}", response_model=FeedbackChatThreadResponse)
def get_feedback_chat_thread(
    answer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return FeedbackChatService(db).get_thread(answer_id=answer_id, user=user)


@router.post("/answers/{answer_id}/messages", response_model=CreateFeedbackChatMessageResponse)
def create_feedback_chat_message(
    answer_id: int,
    payload: CreateFeedbackChatMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return FeedbackChatService(db).create_message(
        answer_id=answer_id,
        user=user,
        content=payload.content,
    )
