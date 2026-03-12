from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.db import get_db
from backend.models.models import Question, Answer, Score
from backend.schemas.scoring import SubmitAnswerRequest, SubmitAnswerResponse
from backend.dev_user import get_or_create_dev_user


router = APIRouter(prefix="/scoring", tags=["scoring"])

@router.post("/submit", response_model=SubmitAnswerResponse)
def submit_answer(payload: SubmitAnswerRequest, db: Session = Depends(get_db)):
    q = db.query(Question).filter(Question.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if q.role != payload.role:
        raise HTTPException(status_code=400, detail="Role does not match question role")

    # 1) save answer
    dev_user = get_or_create_dev_user(db)
    ans = Answer(user_id=dev_user.id, question_id=q.id, answer_text=payload.answer_text)    
    db.add(ans)
    db.flush()  # assigns ans.id

    # 2) placeholder score (we’ll replace with real ML scoring next)
    scores = {
        "technical_depth": 50,
        "clarity": 50,
        "completeness": 50,
        "structure": 50,
    }
    feedback = {
        "strengths": ["Stored successfully (placeholder scoring)."],
        "weaknesses": ["Scoring engine not wired yet."],
        "missing_keywords": [],
        "notes": {},
    }

    sc = Score(answer_id=ans.id, scores=scores, overall=50, feedback=feedback)
    db.add(sc)
    db.commit()

    return SubmitAnswerResponse(
        answer_id=ans.id,
        question_id=q.id,
        role=payload.role,
        overall=50,
        scores=scores,
        feedback=feedback,
    )