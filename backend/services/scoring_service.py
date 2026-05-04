import logging

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from backend.feedback_agent import (
    FeedbackAgentError,
    build_fallback_feedback,
    feedback_enabled,
    generate_agentic_feedback,
)
from backend.ml.scorer import compute_scores
from backend.models.db import SessionLocal
from backend.models.models import Answer, Question, Score, User
from backend.schemas.scoring import (
    GenerateAIFeedbackResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)

logger = logging.getLogger(__name__)


class ScoringService:
    def __init__(self, db: Session):
        self.db = db

    def submit_answer(
        self,
        *,
        payload: SubmitAnswerRequest,
        user: User,
        background_tasks: BackgroundTasks,
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
            if feedback_enabled():
                feedback["ai_feedback_pending"] = True
                feedback["ai_feedback_source"] = "pending"
                feedback["ai_feedback_pending_since"] = answer.created_at.isoformat()

            score = Score(answer_id=answer.id, scores=scores_dict, overall=overall_int, feedback=feedback)
            self.db.add(score)
            self.db.commit()

            if feedback_enabled():
                background_tasks.add_task(generate_and_store_ai_feedback_for_answer_id, answer.id)

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

    def generate_ai_feedback_for_answer(
        self,
        *,
        answer_id: int,
        user: User,
    ) -> GenerateAIFeedbackResponse:
        row = (
            self.db.query(Answer, Question, Score)
            .join(Question, Answer.question_id == Question.id)
            .join(Score, Score.answer_id == Answer.id)
            .filter(Answer.id == answer_id, Answer.user_id == user.id)
            .first()
        )

        if not row:
            raise HTTPException(status_code=404, detail="Answer not found")

        answer, question, score = row
        ai_feedback, ai_feedback_error = generate_and_store_ai_feedback(
            db=self.db,
            answer=answer,
            question=question,
            score=score,
            allow_pending_regeneration=True,
        )

        return GenerateAIFeedbackResponse(
            answer_id=answer.id,
            ai_feedback=ai_feedback,
            ai_feedback_error=ai_feedback_error,
            ai_feedback_source=(score.feedback or {}).get("ai_feedback_source"),
        )


def generate_and_store_ai_feedback(
    *,
    db: Session,
    answer: Answer,
    question: Question,
    score: Score,
    allow_pending_regeneration: bool = False,
) -> tuple[dict | None, str | None]:
    if not feedback_enabled():
        return None, "AI feedback is disabled"

    existing_feedback = score.feedback or {}
    cached_ai_feedback = existing_feedback.get("ai_feedback")
    cached_source = existing_feedback.get("ai_feedback_source")
    cached_error = existing_feedback.get("ai_feedback_error")
    should_retry_model = cached_source == "fallback" or (
        cached_source is None and isinstance(cached_ai_feedback, dict) and isinstance(cached_error, str)
    )

    if isinstance(cached_ai_feedback, dict) and not should_retry_model:
        return cached_ai_feedback, None
    if cached_source == "pending" and not isinstance(cached_ai_feedback, dict) and not allow_pending_regeneration:
        return None, cached_error

    try:
        ai_feedback = generate_agentic_feedback(
            role=question.role,
            question_prompt=question.prompt,
            answer_text=answer.answer_text,
            rubric=question.rubric,
            scores=score.scores,
            overall=score.overall,
            feedback=existing_feedback,
        )
    except FeedbackAgentError as exc:
        error_message = str(exc)
        fallback_feedback = build_fallback_feedback(
            answer_text=answer.answer_text,
            feedback=existing_feedback,
        )
        score.feedback = {
            **existing_feedback,
            "ai_feedback": fallback_feedback,
            "ai_feedback_error": error_message,
            "ai_feedback_source": "fallback",
            "ai_feedback_pending": False,
            "ai_feedback_pending_since": None,
        }
        db.add(score)
        db.commit()
        db.refresh(score)
        return fallback_feedback, error_message

    score.feedback = {
        **existing_feedback,
        "ai_feedback": ai_feedback,
        "ai_feedback_error": None,
        "ai_feedback_source": "model",
        "ai_feedback_pending": False,
        "ai_feedback_pending_since": None,
    }
    db.add(score)
    db.commit()
    db.refresh(score)
    return ai_feedback, None


def generate_and_store_ai_feedback_for_answer_id(answer_id: int) -> None:
    db = SessionLocal()
    try:
        row = (
            db.query(Answer, Question, Score)
            .join(Question, Answer.question_id == Question.id)
            .join(Score, Score.answer_id == Answer.id)
            .filter(Answer.id == answer_id)
            .first()
        )
        if not row:
            return

        answer, question, score = row
        generate_and_store_ai_feedback(
            db=db,
            answer=answer,
            question=question,
            score=score,
            allow_pending_regeneration=True,
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Background AI feedback generation failed for answer %s: %s", answer_id, exc)
    finally:
        db.close()
