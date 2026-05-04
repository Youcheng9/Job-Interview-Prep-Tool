# backend/routers/history.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.models.db import get_db
from backend.models.models import Answer, Question, Score, User
from backend.dependencies import get_current_user
from backend.schemas.history import HistoryResponse, HistoryItem
from backend.utils.question_difficulty import get_question_difficulty

router = APIRouter(prefix="/history", tags=["history"])

@router.get("", response_model=HistoryResponse)
def get_history(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Return recent answers for the authenticated user.

    - limit: maximum number of items to return (default 50)
    """
    rows = (
        db.query(Answer, Question, Score)
        .join(Question, Answer.question_id == Question.id)
        .join(Score, Score.answer_id == Answer.id)
        .filter(Answer.user_id == user.id)
        .order_by(Answer.created_at.desc())
        .limit(limit)
        .all()
    )

    combos = {(q.role, q.level) for _, q, _ in rows}
    difficulty_by_question_id: dict[int, str] = {}
    for role, level in combos:
        question_rows = (
            db.query(Question.id, Question.level)
            .filter(Question.role == role, Question.level == level)
            .order_by(Question.id.asc())
            .all()
        )
        for index, question_row in enumerate(question_rows):
            difficulty_by_question_id[question_row.id] = get_question_difficulty(question_row.level, index)

    items = []
    for ans, q, sc in rows:
        items.append(HistoryItem(
            answer_id=ans.id,
            question_id=q.id,
            role=q.role,
            level=q.level,
            difficulty=difficulty_by_question_id.get(q.id, get_question_difficulty(q.level, 0)),
            prompt=q.prompt,
            answer_text=ans.answer_text,
            created_at=ans.created_at,
            overall=sc.overall,
            scores=sc.scores,
            feedback=sc.feedback,
        ))

    return HistoryResponse(items=items)
