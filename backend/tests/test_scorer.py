from __future__ import annotations

import sys
import types
import unittest
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


RUBRIC = {
    "ideal_answer": "Processes have separate memory spaces. Threads share memory within a process.",
    "concepts": ["process", "thread", "memory space", "shared memory"],
    "dimension_concepts": {
        "technical_depth": ["memory space", "shared memory"],
        "clarity": ["difference", "share"],
        "completeness": ["process", "thread", "memory space", "shared memory"],
        "structure": ["first", "however"],
    },
}


class ScorerTests(unittest.TestCase):
    @patch("backend.ml.scorer.embed_texts")
    @patch("backend.ml.scorer._cached_embeddings")
    def test_missing_concepts_are_not_hidden_by_semantic_similarity(self, cached_embeddings, embed_texts):
        cached_embeddings.return_value = np.array(
            [
                [1.0, 0.0],
                [0.0, 1.0],
                [0.0, 1.0],
                [0.0, 1.0],
            ]
        )
        embed_texts.return_value = np.array(
            [
                [1.0, 0.0],
                [0.95, 0.05],
            ]
        )

        scores, overall, feedback = compute_scores(
            "A process and a thread are both units of execution, but this answer omits the memory details.",
            RUBRIC,
        )

        self.assertLess(scores["completeness"], 90)
        self.assertIn("memory space", feedback["missing_concepts"])
        self.assertIn("shared memory", feedback["missing_concepts"])
        self.assertEqual(feedback["missing_concepts"], feedback["missing_keywords"])
        self.assertFalse(feedback["notes"]["degraded"])

    @patch("backend.ml.scorer.embed_texts", side_effect=RuntimeError("embedding backend unavailable"))
    @patch("backend.ml.scorer._cached_embeddings", side_effect=RuntimeError("embedding backend unavailable"))
    def test_embedding_failures_mark_degraded_scoring(self, _cached_embeddings, _embed_texts):
        _, _, feedback = compute_scores(
            "A process is separate while threads share some resources.",
            RUBRIC,
        )

        self.assertTrue(feedback["notes"]["degraded"])
        self.assertEqual(feedback["notes"]["confidence"], "low")
        self.assertIsNotNone(feedback["notes"]["embedding_error"])

    @patch("backend.ml.scorer.embed_texts")
    @patch("backend.ml.scorer._cached_embeddings")
    def test_process_thread_paraphrase_scores_as_strong_answer(self, cached_embeddings, embed_texts):
        cached_embeddings.return_value = np.array(
            [
                [1.0, 0.0],
                [0.0, 1.0],
                [0.8, 0.2],
                [0.1, 0.9],
            ]
        )
        embed_texts.return_value = np.array(
            [
                [1.0, 0.0],
                [0.95, 0.05],
                [0.85, 0.15],
                [0.1, 0.9],
                [0.7, 0.3],
            ]
        )

        answer = (
            "A process is an independent program with its own memory and resources, "
            "providing high isolation but higher overhead, while a thread is a lightweight "
            "unit of execution within a process that shares memory with other threads."
        )
        _, overall, feedback = compute_scores(answer, RUBRIC)

        self.assertGreaterEqual(overall, 75)
        self.assertTrue(feedback["instant_feedback"]["summary"].startswith("Strong answer overall."))
        self.assertNotIn("memory space", feedback["missing_concepts"])
        self.assertNotIn("shared memory", feedback["missing_concepts"])
        self.assertTrue(feedback["notes"]["quality_indicators"]["has_structure"])

    @patch("backend.ml.scorer.embed_texts")
    @patch("backend.ml.scorer._cached_embeddings", side_effect=RuntimeError("embedding backend unavailable"))
    def test_behavioral_scoring_is_open_ended_and_not_keyword_gap_driven(self, _cached_embeddings, embed_texts):
        rubric = {
            "ideal_answer": (
                "A strong answer describes a specific conflict, the candidate's actions, and the impact or lesson learned."
            ),
            "concepts": ["conflict resolution", "stakeholders", "ownership", "communication"],
            "dimension_concepts": {
                "technical_depth": ["tradeoff", "decision making"],
                "clarity": ["specific example", "clear explanation"],
                "completeness": ["situation", "action", "result"],
                "structure": ["situation", "action", "result"],
            },
        }
        embed_texts.return_value = np.array(
            [
                [1.0, 0.0],
                [0.9, 0.1],
            ]
        )

        answer = (
            "When two teammates disagreed on how to ship a feature, I brought them together, "
            "clarified the tradeoff, and proposed a short experiment so we could make a decision with data. "
            "We aligned on a path, shipped on time, and I learned to surface assumptions earlier."
        )
        scores, overall, feedback = compute_scores(answer, rubric, role="Behavioral")

        self.assertGreaterEqual(overall, 60)
        self.assertEqual(feedback["missing_concepts"], [])
        self.assertGreater(feedback["notes"]["quality_indicators"]["behavioral_signal"], 0.5)
        self.assertGreaterEqual(scores["structure"], 60)
        self.assertEqual(feedback["notes"]["narrative_framework"], "SAR")
        self.assertEqual(feedback["instant_feedback"]["label"], "SAR")
        self.assertIn("STAR", feedback["weaknesses"][0])

    @patch("backend.ml.scorer.embed_texts")
    @patch("backend.ml.scorer._cached_embeddings", side_effect=RuntimeError("embedding backend unavailable"))
    def test_behavioral_star_answer_gets_star_feedback(self, _cached_embeddings, embed_texts):
        rubric = {
            "ideal_answer": "A strong behavioral answer uses STAR with clear ownership, action, and impact.",
            "concepts": ["ownership", "action", "impact"],
            "dimension_concepts": {
                "completeness": ["situation", "task", "action", "result"],
                "structure": ["situation", "task", "action", "result"],
            },
        }
        embed_texts.return_value = np.array(
            [
                [1.0, 0.0],
                [0.85, 0.15],
            ]
        )

        answer = (
            "When our release slipped because two teams disagreed on scope, my task was to get the launch back on track. "
            "I led a working session, cut the risky edge cases, and aligned engineering and product on a smaller milestone. "
            "As a result, we shipped three days later with no critical defects, and I learned to surface scope risk earlier."
        )

        _, overall, feedback = compute_scores(answer, rubric, role="Behavioral")

        self.assertGreaterEqual(overall, 70)
        self.assertEqual(feedback["notes"]["narrative_framework"], "STAR")
        self.assertEqual(feedback["instant_feedback"]["label"], "STAR")
        self.assertTrue(any("STAR narrative" in item for item in feedback["strengths"]))


if __name__ == "__main__":
    unittest.main()
