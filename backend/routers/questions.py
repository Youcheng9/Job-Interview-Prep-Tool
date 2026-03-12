from fastapi import APIRouter, Depends
from pypika import JSON

from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import Question

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
@router.get("")
def list_questions(role: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Question)
    if role:
        q = q.filter(Question.role == role)

    rows = q.order_by(Question.id.asc()).all()

    # Return a simple JSON shape
    return {
        "items": [
            {
                "id": r.id,
                "role": r.role,
                "prompt": r.prompt,
                "rubric": r.rubric,
            }
            for r in rows
        ]
    }
                                       
