from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.schemas.questions import QuestionItem, QuestionsResponse
from backend.services.question_service import QuestionService

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
    return QuestionService(db).list_questions(role=role, level=level)


@router.get("/next", response_model=QuestionItem)
def get_next_question(
    role: str,
    level: str = "new_grad",
    current_id: int | None = None,
    db: Session = Depends(get_db),
):
    return QuestionService(db).get_next_question(role=role, level=level, current_id=current_id)
