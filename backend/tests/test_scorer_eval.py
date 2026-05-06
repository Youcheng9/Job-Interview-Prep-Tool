from __future__ import annotations

import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

sentence_transformers = types.ModuleType("sentence_transformers")


class _SentenceTransformerStub:
    def __init__(self, *_args, **_kwargs):
        pass

    def encode(self, texts, convert_to_numpy=True, show_progress_bar=False):
        return np.zeros((len(texts), 2))


sentence_transformers.SentenceTransformer = _SentenceTransformerStub
sys.modules.setdefault("sentence_transformers", sentence_transformers)

pairwise = types.ModuleType("sklearn.metrics.pairwise")


def _cosine_similarity_stub(a, b):
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

from backend.ml.scorer import compute_scores


QUESTIONS = json.loads(Path("backend/data/questions.json").read_text())
RUBRIC_BY_PROMPT = {item["prompt"]: item["rubric"] for item in QUESTIONS}


def rubric_for_prompt_prefix(prefix: str) -> dict:
    for prompt, rubric in RUBRIC_BY_PROMPT.items():
        if prompt.startswith(prefix):
            return rubric
    raise KeyError(prefix)


def fake_embed_texts(texts: list[str]) -> np.ndarray:
    if len(texts) == 2:
        answer = texts[0].lower()
        if "independent program with its own memory" in answer:
            return np.array([[1.0, 0.0], [0.95, 0.05]])
        if "synchronous waits for an operation to finish" in answer:
            return np.array([[1.0, 0.0], [0.4, 0.6]])
        if "udp is faster because it has smaller packets" in answer:
            return np.array([[1.0, 0.0], [0.15, 0.85]])
        return np.array([[1.0, 0.0], [0.5, 0.5]])

    return np.array([[1.0, 0.0] for _ in texts], dtype=float)


class ScorerEvaluationSetTests(unittest.TestCase):
    @patch("backend.ml.scorer.embed_texts", side_effect=fake_embed_texts)
    @patch("backend.ml.scorer._cached_embeddings", side_effect=RuntimeError("disable concept embeddings"))
    def test_scoring_bands_for_strong_partial_and_wrong_answers(self, _cached_embeddings, _embed_texts):
        strong_answer = (
            "A process is an independent program with its own memory and resources, "
            "while a thread is a lightweight unit of execution inside a process that "
            "shares memory with other threads. Processes give more isolation but have higher overhead."
        )
        partial_answer = (
            "Synchronous waits for an operation to finish before continuing, while asynchronous "
            "lets other work continue. It can help responsiveness, but I did not explain the I/O "
            "tradeoff or how blocking affects throughput."
        )
        wrong_answer = (
            "UDP is faster because it has smaller packets, and TCP mainly exists for large downloads. "
            "They are basically the same except for speed."
        )

        strong_scores, strong_overall, _ = compute_scores(
            strong_answer,
            rubric_for_prompt_prefix("Explain the difference between a process and a thread"),
        )
        partial_scores, partial_overall, _ = compute_scores(
            partial_answer,
            rubric_for_prompt_prefix("What is the difference between synchronous and asynchronous execution"),
        )
        wrong_scores, wrong_overall, _ = compute_scores(
            wrong_answer,
            rubric_for_prompt_prefix("Describe what TCP does for a client-server connection that UDP does not"),
        )

        self.assertGreaterEqual(strong_overall, 75)
        self.assertGreaterEqual(strong_scores["completeness"], 70)

        self.assertGreaterEqual(partial_overall, 45)
        self.assertLess(partial_overall, 75)
        self.assertLess(partial_scores["completeness"], strong_scores["completeness"])

        self.assertLess(wrong_overall, 45)
        self.assertLess(wrong_scores["technical_depth"], partial_scores["technical_depth"])


if __name__ == "__main__":
    unittest.main()
