from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


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

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content must not be blank")
        return value


class CreateFeedbackChatMessageResponse(BaseModel):
    thread_id: int
    answer_id: int
    ai_available: bool
    user_message: FeedbackChatMessageItem
    assistant_message: FeedbackChatMessageItem
