from __future__ import annotations

import os
import tempfile
import types
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path


TEST_DB_FILE = Path(tempfile.gettempdir()) / "interviewprep_test.sqlite"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DB_FILE}")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

sentence_transformers = types.ModuleType("sentence_transformers")


class _SentenceTransformerStub:
    def __init__(self, *_args, **_kwargs):
        pass

    def encode(self, texts, convert_to_numpy=True, show_progress_bar=False):
        import numpy as np

        return np.zeros((len(texts), 2))


sentence_transformers.SentenceTransformer = _SentenceTransformerStub
sys.modules.setdefault("sentence_transformers", sentence_transformers)

pairwise = types.ModuleType("sklearn.metrics.pairwise")


def _cosine_similarity_stub(a, b):
    import numpy as np

    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    a_norm = np.linalg.norm(a, axis=1, keepdims=True)
    b_norm = np.linalg.norm(b, axis=1, keepdims=True)
    denom = np.maximum(a_norm * b_norm.T, 1e-12)
    return (a @ b.T) / denom


pairwise.cosine_similarity = _cosine_similarity_stub
metrics = types.ModuleType("sklearn.metrics")
metrics.pairwise = pairwise
sklearn = types.ModuleType("sklearn")
sklearn.metrics = metrics
sys.modules.setdefault("sklearn", sklearn)
sys.modules.setdefault("sklearn.metrics", metrics)
sys.modules.setdefault("sklearn.metrics.pairwise", pairwise)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.main import app
from backend.models.db import get_db
from backend.models.models import Base, Question, User


TEST_ENGINE = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(bind=TEST_ENGINE, autocommit=False, autoflush=False)


def override_get_db() -> Iterator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def reset_database() -> None:
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)


@contextmanager
def session_scope() -> Iterator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
        db.commit()
    finally:
        db.close()


def client() -> TestClient:
    return TestClient(app)


def create_question(
    *,
    role: str = "SWE",
    level: str = "intern",
    prompt: str = "Explain the difference between a process and a thread.",
    topic: str | None = "operating_systems",
    company: str | None = "Meta",
    companies: list[str] | None = None,
    rubric: dict | None = None,
) -> int:
    if rubric is None:
        rubric = {
            "ideal_answer": "A process has its own memory; threads share memory in a process.",
            "keywords": ["process", "thread", "memory", "shared memory"],
            "dimension_keywords": {
                "technical_depth": ["memory", "shared memory"],
                "clarity": ["difference", "share"],
                "completeness": ["process", "thread", "memory"],
                "structure": ["while", "whereas"],
            },
        }

    with session_scope() as db:
        question = Question(
            role=role,
            level=level,
            topic=topic,
            company=company,
            companies=companies or ([company] if company else []),
            prompt=prompt,
            rubric=rubric,
        )
        db.add(question)
        db.flush()
        return int(question.id)


def auth_headers(email: str = "qa@example.com", password: str = "password123") -> dict[str, str]:
    local_client = client()
    register_response = local_client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    if register_response.status_code not in {200, 400}:
        raise AssertionError(register_response.text)

    login_response = local_client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if login_response.status_code != 200:
        raise AssertionError(login_response.text)
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_user_by_email(email: str) -> User | None:
    with session_scope() as db:
        return db.query(User).filter(User.email == email).first()
