# backend/schemas/history.py
from pydantic import BaseModel
from datetime import datetime
from typing import Any

class HistoryItem(BaseModel):
    answer_id: int
    question_id: int
    role: str
    level: str
    difficulty: str
    prompt: str
    answer_text: str
    created_at: datetime
    overall: int
    scores: dict[str, Any]
    feedback: dict[str, Any]
   

class HistoryResponse(BaseModel):
    items: list[HistoryItem]
