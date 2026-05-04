from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


MessageRole = Literal["user", "assistant"]


class FeedbackChatMessageItem(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: datetime


class FeedbackChatThreadResponse(BaseModel):
    thread_id: int
    answer_id: int
    ai_available: bool
    messages: list[FeedbackChatMessageItem]


class CreateFeedbackChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1500)


class CreateFeedbackChatMessageResponse(BaseModel):
    thread_id: int
    answer_id: int
    ai_available: bool
    user_message: FeedbackChatMessageItem
    assistant_message: FeedbackChatMessageItem
