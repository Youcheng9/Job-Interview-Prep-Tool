from __future__ import annotations

import unittest
from unittest.mock import patch

import numpy as np

from backend.ml.scorer import compute_scores


RUBRIC = {
    "ideal_answer": "Processes have separate memory spaces. Threads share memory within a process.",
    "keywords": ["process", "thread", "memory space", "shared memory"],
    "dimension_keywords": {
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
        self.assertIn("memory space", feedback["missing_keywords"])
        self.assertIn("shared memory", feedback["missing_keywords"])
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


if __name__ == "__main__":
    unittest.main()
