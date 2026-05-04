import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.db import SessionLocal, get_db
from backend.models.models import Question, Answer, Score, User
from backend.schemas.scoring import (
    GenerateAIFeedbackResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
# from backend.dev_user import get_or_create_dev_user
from backend.dependencies import get_current_user
from backend.feedback_agent import (
    FeedbackAgentError,
    build_fallback_feedback,
    feedback_enabled,
    generate_agentic_feedback,
)
from backend.ml.scorer import compute_scores

router = APIRouter(prefix="/scoring", tags=["scoring"])
logger = logging.getLogger(__name__)


def _generate_and_store_ai_feedback(
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


def _generate_and_store_ai_feedback_for_answer_id(answer_id: int) -> None:
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
        _generate_and_store_ai_feedback(
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

@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    payload: SubmitAnswerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Question).filter(Question.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.role != payload.role:
        raise HTTPException(status_code=400, detail="Role does not match question role")
    try:
        # 1) Save the user's answer first so we have an answer_id to attach a score to
        ans = Answer(user_id=user.id, question_id=q.id, answer_text=payload.answer_text)
        db.add(ans)
        db.flush()  # assigns ans.id without committing yet

        # 2) Compute real scores using the question's rubric
        # This returns a per-dimension dict, an overall score (0-100), and a feedback dict.

        scores_dict, overall_int, feedback = compute_scores(payload.answer_text, q.rubric)
        if feedback_enabled():
            feedback["ai_feedback_pending"] = True
            feedback["ai_feedback_source"] = "pending"
            feedback["ai_feedback_pending_since"] = ans.created_at.isoformat()

        # 3) Save the score linked to this answer
        sc = Score(answer_id=ans.id, scores=scores_dict, overall=overall_int, feedback=feedback)
        db.add(sc)

        # 4) Commit once at the end (saves Answer + Score together)
        db.commit()
        if feedback_enabled():
            background_tasks.add_task(_generate_and_store_ai_feedback_for_answer_id, ans.id)

        # 5) Return the computed score to the client
        return SubmitAnswerResponse(
            answer_id=ans.id,
            question_id=q.id,
            role=payload.role,
            overall=overall_int,
            scores=scores_dict,
            feedback=feedback,
        )
    
    except Exception:
        # if anything fails, rollback to prevents half-finished DB writes
        db.rollback()
        
        # Return a clean error message instead of exposing an internal traceback
        raise HTTPException(
            status_code=500,
            detail="Failed to score answer",
        )


@router.post("/{answer_id}/ai-feedback", response_model=GenerateAIFeedbackResponse)
def generate_ai_feedback_for_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = (
        db.query(Answer, Question, Score)
        .join(Question, Answer.question_id == Question.id)
        .join(Score, Score.answer_id == Answer.id)
        .filter(Answer.id == answer_id, Answer.user_id == user.id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Answer not found")

    answer, question, score = row
    ai_feedback, ai_feedback_error = _generate_and_store_ai_feedback(
        db=db,
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
