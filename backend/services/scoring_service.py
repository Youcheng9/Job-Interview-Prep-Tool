from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.ml.scorer import compute_scores
from backend.models.models import Answer, Question, Score, User
from backend.schemas.scoring import SubmitAnswerRequest, SubmitAnswerResponse


class ScoringService:
    def __init__(self, db: Session):
        self.db = db

    def submit_answer(
        self,
        *,
        payload: SubmitAnswerRequest,
        user: User,
    ) -> SubmitAnswerResponse:
        question = self.db.query(Question).filter(Question.id == payload.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        if question.role != payload.role:
            raise HTTPException(status_code=400, detail="Role does not match question role")

        try:
            answer = Answer(user_id=user.id, question_id=question.id, answer_text=payload.answer_text)
            self.db.add(answer)
            self.db.flush()

            scores_dict, overall_int, feedback = compute_scores(payload.answer_text, question.rubric)

            score = Score(answer_id=answer.id, scores=scores_dict, overall=overall_int, feedback=feedback)
            self.db.add(score)
            self.db.commit()

            return SubmitAnswerResponse(
                answer_id=answer.id,
                question_id=question.id,
                role=payload.role,
                overall=overall_int,
                scores=scores_dict,
                feedback=feedback,
            )
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise HTTPException(status_code=500, detail="Failed to score answer")
