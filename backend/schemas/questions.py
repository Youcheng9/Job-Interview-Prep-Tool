# backend/schemas/questions.py

"""
Schemas for the Questions API.

These define the shape of data returned by the /questions endpoint.
Keeping schemas separate from routers helps keep the API contract clear.
"""

from pydantic import BaseModel


class QuestionItem(BaseModel):
    """
    Represents a single interview question returned to the frontend.
    Note: We intentionally do NOT include the rubric here.
    The rubric is internal scoring logic and should remain backend-only.
    """
    id: int
    role: str
    level: str
    company: str | None = None
    companies: list[str] = []
    prompt: str
    difficulty: str


class QuestionsResponse(BaseModel):
    """
    Wrapper response for the questions endpoint.

    The frontend will always receive a list under `items`.
    """
    items: list[QuestionItem]
