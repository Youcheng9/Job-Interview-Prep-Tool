# backend/ml/scorer.py
"""
Deterministic scoring pipeline for InterviewPrep.

This scorer favors:
- semantic similarity between the answer and the ideal answer
- concept coverage rather than exact keyword overlap
- explainable feedback that still works without an LLM
"""

from functools import lru_cache
import logging
import re
from typing import Dict, List, Tuple

import numpy as np

from backend.ml.embedder import cosine_similarity_safe, embed_texts

logger = logging.getLogger(__name__)

MATCHED_CONCEPT_THRESHOLD = 0.75
MISSING_CONCEPT_THRESHOLD = 0.55


def _tokenize(text: str) -> List[str]:
    """
    Simple tokenization: lowercase + word boundaries.
    """
    return re.findall(r"\b[a-zA-Z0-9_+-]+\b", text.lower())


def _normalize_text(text: str) -> str:
    return " ".join(_tokenize(text))


def _split_answer_segments(answer_text: str) -> List[str]:
    segments = [segment.strip() for segment in re.split(r"[.!?\n]+", answer_text) if segment.strip()]
    if answer_text.strip():
        segments.append(answer_text.strip())
    return segments


def _lexical_overlap_score(answer_tokens: set[str], concept: str) -> float:
    concept_tokens = _tokenize(concept)
    if not concept_tokens:
        return 0.0

    if all(token in answer_tokens for token in concept_tokens):
        return 1.0

    match_count = sum(1 for token in concept_tokens if token in answer_tokens)
    if match_count == 0:
        return 0.0

    return min(0.85, match_count / len(concept_tokens))


def _semantic_concept_scores(answer_text: str, concepts: List[str]) -> Dict[str, float]:
    if not concepts:
        return {}

    answer_tokens = set(_tokenize(answer_text))
    concept_scores = {
        concept: _lexical_overlap_score(answer_tokens, concept)
        for concept in concepts
    }

    normalized_segments = [_normalize_text(segment) for segment in _split_answer_segments(answer_text)]
    normalized_segments = [segment for segment in normalized_segments if segment]
    if not normalized_segments:
        normalized_segments = [_normalize_text(answer_text)]

    try:
        segment_embeddings = embed_texts(normalized_segments)
        concept_embeddings = _cached_embeddings(tuple(concepts))

        for concept, concept_embedding in zip(concepts, concept_embeddings):
            best_similarity = max(
                cosine_similarity_safe(segment_embedding, concept_embedding)
                for segment_embedding in segment_embeddings
            )

            # Map a reasonably strong semantic match into partial/full concept credit.
            semantic_score = max(0.0, min(1.0, (best_similarity - 0.35) / 0.45))
            concept_scores[concept] = max(concept_scores[concept], semantic_score)
    except Exception as exc:
        logger.warning("Concept embedding lookup failed; using lexical scoring only: %s", exc)

    return concept_scores


@lru_cache(maxsize=512)
def _cached_embeddings(concepts: tuple[str, ...]) -> np.ndarray:
    return embed_texts(list(concepts))


def _collect_dimension_evidence(
    answer_text: str,
    dimension_keywords: Dict[str, List[str]],
) -> tuple[Dict[str, Dict[str, object]], list[str], set[str]]:
    evidence: Dict[str, Dict[str, object]] = {}
    matched_any: set[str] = set()
    unmatched_any: list[str] = []

    for dimension, keywords in dimension_keywords.items():
        if not keywords:
            continue

        dim_cov, dim_scores = concept_coverage(answer_text, keywords)
        matched = [concept for concept, score in dim_scores.items() if score >= MATCHED_CONCEPT_THRESHOLD]
        unmatched = [concept for concept, score in dim_scores.items() if score < MISSING_CONCEPT_THRESHOLD]

        matched_any.update(matched)
        unmatched_any.extend(unmatched)
        evidence[dimension] = {
            "coverage": round(dim_cov, 4),
            "matched_concepts": matched,
            "unmatched_concepts": unmatched,
            "concept_scores": {concept: round(score, 4) for concept, score in dim_scores.items()},
        }

    return evidence, unmatched_any, matched_any


def _score_confidence(*, embedding_error: str | None, answer_words: int, keyword_count: int) -> str:
    if embedding_error:
        return "low"
    if answer_words < 25 or keyword_count < 3:
        return "medium"
    return "high"


def concept_coverage(answer_text: str, concepts: List[str]) -> tuple[float, Dict[str, float]]:
    """
    Compute semantic concept coverage in [0.0, 1.0].

    Exact wording is not required:
    - direct phrase hits count
    - semantically equivalent paraphrases can also count
    """
    if not concepts:
        return 0.0, {}

    concept_scores = _semantic_concept_scores(answer_text, concepts)
    coverage = sum(concept_scores.values()) / len(concepts)
    return min(1.0, coverage), concept_scores


def compute_scores(
    answer_text: str,
    rubric: Dict,
    weights: Dict = None,
) -> Tuple[Dict[str, int], int, Dict]:
    """
    Compute per-dimension integer scores (0-100), overall score, and feedback.

    - rubric: expected to have 'ideal_answer' and 'keywords' at minimum.
    - weights: optional weights for signals; defaults to similarity=0.6, concept=0.4
    """
    if weights is None:
        weights = {"similarity": 0.6, "keyword": 0.4}

    ideal = rubric.get("ideal_answer", "")
    keywords = rubric.get("keywords", []) or []
    dim_keys = rubric.get("dimension_keywords", {}) or {}

    answer_words = len(answer_text.split())
    ideal_words = len(ideal.split())
    length_ratio = min(answer_words / max(ideal_words, 10), 2.0)
    length_penalty = max(0.3, min(1.0, length_ratio * 0.8))

    embedding_error = None
    semantic_equivalence = 0.0
    try:
        embs = embed_texts([answer_text, ideal])
        sim_raw = cosine_similarity_safe(embs[0], embs[1])
        semantic_equivalence = max(0.0, (sim_raw + 1) / 2)
        similarity = semantic_equivalence * length_penalty
    except Exception as exc:
        similarity = 0.0
        embedding_error = str(exc)
        logger.warning("Ideal-answer embedding failed; falling back to lexical scoring: %s", exc)

    concept_cov_raw, concept_scores = concept_coverage(answer_text, keywords)
    concept_cov = concept_cov_raw
    dimension_evidence, dimension_unmatched, dimension_matched = _collect_dimension_evidence(answer_text, dim_keys)

    has_structure = any(
        word in answer_text.lower()
        for word in ["first", "then", "next", "finally", "however", "therefore"]
    )
    has_examples = any(
        word in answer_text.lower()
        for word in ["example", "for instance", "such as", "like"]
    )
    quality_bonus = (0.1 if has_structure else 0) + (0.1 if has_examples else 0)

    base_score = 100 * min(1.0, weights["similarity"] * similarity + weights["keyword"] * concept_cov + quality_bonus)

    semantic_strength = max(similarity, semantic_equivalence)

    dimensions = ["technical_depth", "clarity", "completeness", "structure"]
    scores = {}
    for dim in dimensions:
        dim_kw = dim_keys.get(dim)
        if dim_kw:
            dim_cov = float(dimension_evidence.get(dim, {}).get("coverage", 0.0))
            if dim == "structure":
                dim_score = 100 * (0.35 * semantic_strength + 0.25 * dim_cov + 0.40 * (1 if has_structure else 0))
            elif dim == "clarity":
                clarity_bonus = 0.1 if has_examples else 0
                dim_score = 100 * (0.45 * semantic_strength + 0.35 * dim_cov + clarity_bonus)
            else:
                dim_score = 100 * (0.45 * semantic_strength + 0.55 * dim_cov)
        else:
            if dim == "structure":
                dim_score = base_score * (0.8 + 0.2 * (1 if has_structure else 0))
            elif dim == "clarity":
                dim_score = base_score * (0.9 + 0.1 * (1 if has_examples else 0))
            else:
                dim_score = base_score

        scores[dim] = int(round(max(0, min(100, dim_score))))

    dimension_average = sum(scores.values()) / len(scores)
    semantic_bonus = max(0.0, (semantic_equivalence - 0.75) * 20)
    overall_score = dimension_average + semantic_bonus

    if overall_score > max(scores.values()) + 6:
        overall_score = max(scores.values()) + 6

    if overall_score > 95:
        overall_score = 95
    elif overall_score > 85:
        overall_score = min(overall_score, 92)

    overall_score = int(round(max(0, min(100, overall_score))))

    adjusted_concept_scores = concept_scores

    missing = [concept for concept, score in adjusted_concept_scores.items() if score < MISSING_CONCEPT_THRESHOLD]
    covered = [concept for concept, score in adjusted_concept_scores.items() if score >= MATCHED_CONCEPT_THRESHOLD]
    for concept in dimension_unmatched:
        if concept not in covered and concept not in missing:
            missing.append(concept)

    strengths = []
    weaknesses = []

    if semantic_equivalence > 0.7:
        strengths.append("Strong conceptual understanding demonstrated.")
    elif semantic_equivalence > 0.4:
        strengths.append("Good foundation, but could be more precise.")
    else:
        weaknesses.append("Answer lacks alignment with expected concepts.")

    if concept_cov > 0.8:
        strengths.append("Excellent coverage of the core concepts, even with paraphrased wording.")
    elif concept_cov > 0.5:
        strengths.append("Good coverage of important concepts.")
    else:
        weaknesses.append("Missing several key technical concepts.")

    if has_structure:
        strengths.append("Well-structured response with clear organization.")
    else:
        weaknesses.append("Consider organizing your answer with clear sections or transitions.")

    if has_examples:
        strengths.append("Effective use of examples to illustrate points.")
    else:
        weaknesses.append("Adding concrete examples would strengthen your answer.")

    if answer_words < ideal_words * 0.5:
        weaknesses.append("Answer is too brief - expand on your points.")
    elif answer_words > ideal_words * 2:
        weaknesses.append("Answer is overly verbose - focus on key points.")

    degraded = embedding_error is not None
    confidence = _score_confidence(
        embedding_error=embedding_error,
        answer_words=answer_words,
        keyword_count=len(keywords),
    )

    feedback = {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing,
        "notes": {
            "similarity_raw": similarity,
            "semantic_equivalence": semantic_equivalence,
            "answer_relevance": semantic_equivalence,
            "keyword_coverage": concept_cov,
            "keyword_coverage_raw": concept_cov_raw,
            "concept_coverage": concept_cov,
            "covered_concepts": covered,
            "matched_concepts": sorted(dimension_matched),
            "concept_scores": {concept: round(score, 4) for concept, score in adjusted_concept_scores.items()},
            "length_penalty": length_penalty,
            "embedding_error": embedding_error,
            "degraded": degraded,
            "confidence": confidence,
            "dimension_evidence": dimension_evidence,
            "quality_indicators": {
                "has_structure": has_structure,
                "has_examples": has_examples,
            },
            "ideal_snippet": ideal[:300] if ideal else None,
        },
    }

    return scores, overall_score, feedback
