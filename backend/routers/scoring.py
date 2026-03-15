from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import Question, Answer, Score, User
from backend.schemas.scoring import SubmitAnswerRequest, SubmitAnswerResponse
# from backend.dev_user import get_or_create_dev_user
from backend.dependencies import get_current_user
from backend.ml.scorer import compute_scores

router = APIRouter(prefix="/scoring", tags=["scoring"])

@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(
    payload: SubmitAnswerRequest,
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

        # 3) Save the score linked to this answer
        sc = Score(answer_id=ans.id, scores=scores_dict, overall=overall_int, feedback=feedback)
        db.add(sc)

        # 4) Commit once at the end (saves Answer + Score together)
        db.commit()

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
        
        