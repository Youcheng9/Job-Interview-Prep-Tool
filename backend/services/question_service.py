from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.models import Question
from backend.schemas.questions import QuestionItem, QuestionsResponse
from backend.utils.question_difficulty import get_question_difficulty


class QuestionService:
    def __init__(self, db: Session):
        self.db = db

    def list_questions(self, *, role: str | None = None, level: str = "new_grad") -> QuestionsResponse:
        query = self.db.query(Question)
        if role:
            query = query.filter(Question.role == role)
        rows = query.filter(Question.level == level).order_by(Question.id.asc()).all()

        return QuestionsResponse(
            items=[
                QuestionItem(
                    id=row.id,
                    role=row.role,
                    level=row.level,
                    topic=row.topic,
                    company=(row.companies[0] if row.companies else row.company),
                    companies=row.companies or ([row.company] if row.company else []),
                    prompt=row.prompt,
                    difficulty=get_question_difficulty(row.level, index),
                )
                for index, row in enumerate(rows)
            ]
        )

    def get_next_question(
        self,
        *,
        role: str,
        level: str = "new_grad",
        current_id: int | None = None,
    ) -> QuestionItem:
        query = self.db.query(Question).filter(Question.role == role, Question.level == level)
        base_query = self.db.query(Question).filter(Question.role == role, Question.level == level)

        if current_id is not None:
            query = query.filter(Question.id > current_id)

        row = query.order_by(Question.id.asc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="No next question found")

        index = base_query.filter(Question.id <= row.id).count() - 1
        return QuestionItem(
            id=row.id,
            role=row.role,
            level=row.level,
            topic=row.topic,
            company=(row.companies[0] if row.companies else row.company),
            companies=row.companies or ([row.company] if row.company else []),
            prompt=row.prompt,
            difficulty=get_question_difficulty(row.level, max(index, 0)),
        )
