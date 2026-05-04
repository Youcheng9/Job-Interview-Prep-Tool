from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.feedback_agent import (
    FeedbackAgentError,
    build_fallback_chat_reply,
    feedback_enabled,
    generate_feedback_chat_reply,
)
from backend.models.models import Answer, FeedbackMessage, FeedbackThread, Question, Score, User
from backend.schemas.feedback_chat import (
    CreateFeedbackChatMessageResponse,
    FeedbackChatMessageItem,
    FeedbackChatThreadResponse,
)

MAX_CONTEXT_MESSAGES = 8


class FeedbackChatService:
    def __init__(self, db: Session):
        self.db = db

    def get_thread(self, *, answer_id: int, user: User) -> FeedbackChatThreadResponse:
        answer, _, _, thread = self._load_answer_context(answer_id=answer_id, user=user)
        if not thread:
            thread = self._create_thread(answer=answer, user=user)
        return self._thread_response(answer_id=answer.id, thread=thread)

    def create_message(self, *, answer_id: int, user: User, content: str) -> CreateFeedbackChatMessageResponse:
        answer, question, score, thread = self._load_answer_context(answer_id=answer_id, user=user)
        if not thread:
            thread = self._create_thread(answer=answer, user=user)

        user_message = FeedbackMessage(thread_id=thread.id, role="user", content=content.strip())
        self.db.add(user_message)
        self.db.flush()

        history = [
            {"role": message.role, "content": message.content}
            for message in thread.messages[-MAX_CONTEXT_MESSAGES:]
        ]
        history.append({"role": "user", "content": user_message.content})

        if feedback_enabled():
            try:
                assistant_content = generate_feedback_chat_reply(
                    role=question.role,
                    question_prompt=question.prompt,
                    answer_text=answer.answer_text,
                    rubric=question.rubric,
                    scores=score.scores,
                    overall=score.overall,
                    feedback=score.feedback or {},
                    history=history,
                )
            except FeedbackAgentError:
                assistant_content = build_fallback_chat_reply(
                    user_message=user_message.content,
                    feedback=score.feedback or {},
                )
        else:
            assistant_content = build_fallback_chat_reply(
                user_message=user_message.content,
                feedback=score.feedback or {},
            )

        assistant_message = FeedbackMessage(thread_id=thread.id, role="assistant", content=assistant_content)
        self.db.add(assistant_message)
        self.db.commit()
        self.db.refresh(thread)
        self.db.refresh(user_message)
        self.db.refresh(assistant_message)

        return CreateFeedbackChatMessageResponse(
            thread_id=thread.id,
            answer_id=answer.id,
            ai_available=feedback_enabled(),
            user_message=self._message_item(user_message),
            assistant_message=self._message_item(assistant_message),
        )

    def _load_answer_context(
        self,
        *,
        answer_id: int,
        user: User,
    ) -> tuple[Answer, Question, Score, FeedbackThread | None]:
        row = (
            self.db.query(Answer, Question, Score, FeedbackThread)
            .join(Question, Answer.question_id == Question.id)
            .join(Score, Score.answer_id == Answer.id)
            .outerjoin(FeedbackThread, FeedbackThread.answer_id == Answer.id)
            .filter(Answer.id == answer_id, Answer.user_id == user.id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Answer not found")
        return row

    def _create_thread(self, *, answer: Answer, user: User) -> FeedbackThread:
        thread = FeedbackThread(user_id=user.id, answer_id=answer.id)
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)
        return thread

    def _thread_response(self, *, answer_id: int, thread: FeedbackThread) -> FeedbackChatThreadResponse:
        self.db.refresh(thread)
        return FeedbackChatThreadResponse(
            thread_id=thread.id,
            answer_id=answer_id,
            ai_available=feedback_enabled(),
            messages=[self._message_item(message) for message in thread.messages],
        )

    def _message_item(self, message: FeedbackMessage) -> FeedbackChatMessageItem:
        return FeedbackChatMessageItem(
            id=message.id,
            role=message.role,
            content=message.content,
            created_at=message.created_at,
        )
