from pydantic import BaseModel, Field
from typing import Any, Literal

Role = Literal["SWE", "DataScience", "PM", "Behavioral"]

class SubmitAnswerRequest(BaseModel):
    question_id: int
    role: Role
    answer_text: str = Field(min_length=1, max_length=8000)

class SubmitAnswerResponse(BaseModel):
    answer_id: int
    question_id: int
    role: Role
    overall: int
    scores: dict[str, int]
    feedback: dict[str, Any]


class GenerateAIFeedbackResponse(BaseModel):
    answer_id: int
    ai_feedback: dict[str, Any] | None = None
    ai_feedback_error: str | None = None
    ai_feedback_source: str | None = None
