from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, JSON, UniqueConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.models.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    answers: Mapped[list["Answer"]] = relationship(back_populates="user")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # SWE, DataScience, PM, Behavioral
    level: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="new_grad")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    rubric: Mapped[dict] = mapped_column(JSON, nullable=False)  # ideal_answer, keywords, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("role", "level", "prompt", name="uq_questions_role_level_prompt"),
    )
    
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")
    
    
class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), nullable=False, index=True)

    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # relationships (optional but very useful)
    user: Mapped["User"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")
    score: Mapped["Score"] = relationship(back_populates="answer", uselist=False)

class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # one score per answer
    answer_id: Mapped[int] = mapped_column(ForeignKey("answers.id"), nullable=False, unique=True, index=True)

    # stored as JSON: {technical_depth: 80, clarity: 90, ...}
    scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall: Mapped[int] = mapped_column(Integer, nullable=False)

    # stored as JSON: strengths, weaknesses, missing_keywords, notes
    feedback: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    answer: Mapped["Answer"] = relationship(back_populates="score")
