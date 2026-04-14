from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import Question
from backend.schemas.questions import QuestionItem, QuestionsResponse

# the code explanantion:
# 'prefix' means all URLs in this file start with /questions 
# # (e.g., /questions/all)
# 'tags' groups these endpoints together in the /docs 
# # (Swagger) interface
router = APIRouter(prefix="/questions", tags=["questions"])


# Because the prefix is "/questions", an empty string "" means 
# # the URL is just "/questions"
# 'role: str | None = None' makes 'role' an OPTIONAL query 
# #parameter (e.g., /questions?role=admin)
@router.get("", response_model=QuestionsResponse)
def list_questions(
    role: str | None = None,
    level: str = "new_grad",
    db: Session = Depends(get_db),
):
    q = db.query(Question)
    if role:
        q = q.filter(Question.role == role)
    q = q.filter(Question.level == level)

    rows = q.order_by(Question.id.asc()).all()

    # Return a simple JSON shape
    return QuestionsResponse(
    items=[
        QuestionItem(
            id=r.id,
            role=r.role,
            level=r.level,
            prompt=r.prompt
        )
        for r in rows
    ]
)


@router.get("/next", response_model=QuestionItem)
def get_next_question(
    role: str,
    level: str = "new_grad",
    current_id: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.role == role, Question.level == level)

    if current_id is not None:
        q = q.filter(Question.id > current_id)

    row = q.order_by(Question.id.asc()).first()
    if not row:
        raise HTTPException(status_code=404, detail="No next question found")

    return QuestionItem(
        id=row.id,
        role=row.role,
        level=row.level,
        prompt=row.prompt,
    )
