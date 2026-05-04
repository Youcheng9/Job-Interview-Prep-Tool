"""
Embedding helpers for backend scoring.

This module owns:
- lazy model loading
- text -> embedding conversion
- cosine similarity over embeddings
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_NAME = "all-MiniLM-L6-v2"
_MODEL: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    """
    Lazily load and cache the sentence-transformer model.
    """
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(MODEL_NAME)
    return _MODEL


def warm_model() -> SentenceTransformer:
    """
    Load the model during app startup to avoid first-request latency.
    """
    return get_model()


@lru_cache(maxsize=4096)
def embed_text_cached(text: str) -> tuple[float, ...]:
    vector = get_model().encode([text], convert_to_numpy=True, show_progress_bar=False)[0]
    return tuple(float(value) for value in vector)


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Embed a list of texts and return a numpy array of shape (n, dim).
    """
    if not texts:
        return np.empty((0, 0))

    if len(texts) == 1:
        return np.array([embed_text_cached(texts[0])], dtype=float)

    model = get_model()
    return model.encode(texts, convert_to_numpy=True, show_progress_bar=False)


def cosine_similarity_safe(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine similarity between two 1-D vectors.

    Returns 0.0 when either vector is all zeros.
    """
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    return float(cosine_similarity(a.reshape(1, -1), b.reshape(1, -1))[0, 0])
