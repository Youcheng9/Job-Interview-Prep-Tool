"""
Embedding helpers for backend scoring.

This module owns:
- lazy model loading
- text -> embedding conversion
- cosine similarity over embeddings
"""

from __future__ import annotations

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


def embed_texts(texts: list[str]) -> np.ndarray:
    """
    Embed a list of texts and return a numpy array of shape (n, dim).
    """
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
