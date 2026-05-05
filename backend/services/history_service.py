from sqlalchemy.orm import Session

from backend.models.models import Answer, Question, Score, User
from backend.schemas.history import HistoryItem, HistoryResponse
from backend.utils.question_difficulty import get_question_difficulty


class HistoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_history(self, *, user: User, limit: int = 50) -> HistoryResponse:
        rows = (
            self.db.query(Answer, Question, Score)
            .join(Question, Answer.question_id == Question.id)
            .join(Score, Score.answer_id == Answer.id)
            .filter(Answer.user_id == user.id)
            .order_by(Answer.created_at.desc())
            .limit(limit)
            .all()
        )

        combos = {(question.role, question.level) for _, question, _ in rows}
        difficulty_by_question_id: dict[int, str] = {}
        for role, level in combos:
            question_rows = (
                self.db.query(Question.id, Question.level)
                .filter(Question.role == role, Question.level == level)
                .order_by(Question.id.asc())
                .all()
            )
            for index, question_row in enumerate(question_rows):
                difficulty_by_question_id[question_row.id] = get_question_difficulty(question_row.level, index)

        items = [
            HistoryItem(
                answer_id=answer.id,
                question_id=question.id,
                role=question.role,
                level=question.level,
                company=(question.companies[0] if question.companies else question.company),
                companies=question.companies or ([question.company] if question.company else []),
                difficulty=difficulty_by_question_id.get(question.id, get_question_difficulty(question.level, 0)),
                prompt=question.prompt,
                answer_text=answer.answer_text,
                created_at=answer.created_at,
                overall=score.overall,
                scores=score.scores,
                feedback=score.feedback,
            )
            for answer, question, score in rows
        ]
        return HistoryResponse(items=items)
