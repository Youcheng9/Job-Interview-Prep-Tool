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

CONCEPT_ALIASES: dict[str, list[str]] = {
    "address space": [
        "own memory",
        "separate memory",
        "separate memory space",
        "independent memory",
    ],
    "shared memory": [
        "share memory",
        "shares memory",
        "memory shared",
    ],
    "resource isolation": [
        "own resources",
        "isolated resources",
        "resource separation",
    ],
    "context switch": [
        "higher overhead",
        "switching overhead",
        "context-switch cost",
        "context switching cost",
    ],
    "cost": [
        "overhead",
        "heavier weight",
        "lighter weight",
        "lightweight",
    ],
}


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
    variants = [concept, *CONCEPT_ALIASES.get(concept.lower(), [])]
    best_score = 0.0

    for variant in variants:
        concept_tokens = _tokenize(variant)
        if not concept_tokens:
            continue

        if all(token in answer_tokens for token in concept_tokens):
            return 1.0

        match_count = sum(1 for token in concept_tokens if token in answer_tokens)
        if match_count == 0:
            continue

        best_score = max(best_score, min(0.85, match_count / len(concept_tokens)))

    return best_score


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


def _build_instant_feedback(
    *,
    overall_score: int,
    strengths: list[str],
    weaknesses: list[str],
    missing_keywords: list[str],
    has_structure: bool,
    has_examples: bool,
) -> dict[str, object]:
    if overall_score >= 80:
        summary = "Strong answer overall. The core ideas are there, and the response is reasonably interview-ready."
    elif overall_score >= 60:
        summary = "Decent foundation, but the answer still needs clearer precision, stronger support, or better structure."
    else:
        summary = "The answer is not yet interview-ready. It needs stronger coverage of the key concepts and a clearer explanation."

    improvements: list[str] = []
    if missing_keywords:
        improvements.append(f"Explicitly cover {', '.join(missing_keywords[:2])}.")
    if not has_structure:
        improvements.append("Use a tighter structure: direct answer, reasoning, example, takeaway.")
    if not has_examples:
        improvements.append("Add one concrete example or tradeoff to make the answer more convincing.")
    if not improvements and weaknesses:
        improvements.append(weaknesses[0])
    if not improvements:
        improvements.append("Make the explanation more specific and tie it back to the question.")

    next_focus = "Specificity"
    if missing_keywords:
        next_focus = missing_keywords[0]
    elif not has_structure:
        next_focus = "Answer structure"
    elif not has_examples:
        next_focus = "Concrete examples"
    elif weaknesses:
        next_focus = weaknesses[0]

    return {
        "summary": summary,
        "improvements": improvements[:2],
        "next_focus": next_focus,
        "label": "deterministic",
        "source": "deterministic",
        "strength_snapshot": strengths[:2],
        "weakness_snapshot": weaknesses[:2],
    }


def _behavioral_signal_score(answer_text: str) -> float:
    lowered = answer_text.lower()

    signal_checks = {
        "ownership": any(token in lowered for token in [" i ", " my ", " we ", " our "]),
        "specific_example": any(token in lowered for token in ["when ", "once ", "during ", "in that situation", "for example"]),
        "action": any(
            token in lowered
            for token in [
                "decided",
                "led",
                "aligned",
                "communicated",
                "resolved",
                "prioritized",
                "owned",
                "handled",
                "drove",
            ]
        ),
        "outcome": any(
            token in lowered
            for token in ["result", "impact", "outcome", "improved", "delivered", "shipped", "resolved"]
        ),
        "reflection": any(
            token in lowered
            for token in ["learned", "would do differently", "next time", "in retrospect", "takeaway"]
        ),
    }

    score = sum(1 for present in signal_checks.values() if present) / len(signal_checks)
    if len(answer_text.split()) >= 60:
        score = min(1.0, score + 0.1)
    return score


def _contains_any(text: str, phrases: list[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _behavioral_story_components(answer_text: str) -> dict[str, bool]:
    lowered = f" {answer_text.lower()} "
    return {
        "situation": _contains_any(
            lowered,
            [" when ", " during ", " on one project ", " in that situation ", " at the time ", " we had "],
        ),
        "task": _contains_any(
            lowered,
            [" my goal ", " my task ", " i needed to ", " i was responsible for ", " the goal was ", " i had to "],
        ),
        "action": _contains_any(
            lowered,
            [
                " i decided ",
                " i led ",
                " i aligned ",
                " i communicated ",
                " i resolved ",
                " i prioritized ",
                " i owned ",
                " i handled ",
                " i drove ",
                " i set up ",
                " i brought ",
                " i proposed ",
                " i clarified ",
            ],
        ),
        "result": _contains_any(
            lowered,
            [" as a result ", " the result ", " outcome ", " impact ", " improved ", " shipped ", " delivered ", " resolved ", " reduced ", " increased "],
        ),
        "reflection": _contains_any(
            lowered,
            [" i learned ", " next time ", " in retrospect ", " takeaway ", " i would do differently "],
        ),
        "ownership": _contains_any(
            lowered,
            [" i owned ", " i took ownership ", " i was responsible ", " i drove ", " i led "],
        ),
        "stakeholders": _contains_any(
            lowered,
            [" teammate", " teammates", " manager", " stakeholder", " customer", " cross-functional", " product", " design", " engineering"],
        ),
    }


def _behavioral_framework_label(components: dict[str, bool]) -> str:
    has_sar = components["situation"] and components["action"] and components["result"]
    has_star = has_sar and components["task"]
    if has_star:
        return "STAR"
    if has_sar:
        return "SAR"
    return "partial"


def _build_behavioral_instant_feedback(
    *,
    overall_score: int,
    framework: str,
    components: dict[str, bool],
    strengths: list[str],
    weaknesses: list[str],
) -> dict[str, object]:
    if overall_score >= 80:
        summary = "Strong behavioral answer. The story is concrete, ownership is visible, and the narrative lands clearly."
    elif framework == "SAR":
        summary = "Usable story, but it reads more like SAR than full STAR. Make the task explicit and sharpen the impact."
    elif overall_score >= 60:
        summary = "The answer has a workable story, but the narrative still needs clearer structure, stronger ownership, or a sharper result."
    else:
        summary = "The response is too vague for a strong behavioral interview answer. Build it around a specific story with explicit action and result."

    improvements: list[str] = []
    if not components["situation"]:
        improvements.append("Open with the exact situation so the interviewer can anchor the story quickly.")
    if not components["task"]:
        improvements.append("State your task or responsibility explicitly so the answer follows STAR instead of a loose SAR story.")
    if not components["action"]:
        improvements.append("Spend more time on what you specifically did, not just what the team decided.")
    if not components["result"]:
        improvements.append("Close with a concrete result, impact, or decision outcome.")
    if not components["reflection"]:
        improvements.append("Add a short takeaway or what you learned to show judgment.")
    if not improvements and weaknesses:
        improvements.append(weaknesses[0])

    next_focus = "Result"
    if not components["situation"]:
        next_focus = "Situation"
    elif not components["task"]:
        next_focus = "Task"
    elif not components["action"]:
        next_focus = "Action"
    elif not components["result"]:
        next_focus = "Result"
    elif not components["reflection"]:
        next_focus = "Reflection"

    return {
        "summary": summary,
        "improvements": improvements[:2],
        "next_focus": next_focus,
        "label": framework,
        "source": "behavioral-deterministic",
        "strength_snapshot": strengths[:2],
        "weakness_snapshot": weaknesses[:2],
    }


def _compute_behavioral_scores(
    answer_text: str,
    rubric: Dict,
    similarity: float,
    semantic_equivalence: float,
    concept_cov: float,
    concept_cov_raw: float,
    dimension_evidence: Dict[str, Dict[str, object]],
    answer_words: int,
    embedding_error: str | None,
    ideal: str,
) -> Tuple[Dict[str, int], int, Dict]:
    components = _behavioral_story_components(answer_text)
    framework = _behavioral_framework_label(components)
    behavioral_signal = _behavioral_signal_score(answer_text)

    action_score = 1.0 if components["action"] else 0.0
    result_score = 1.0 if components["result"] else 0.0
    structure_score = (
        0.25 * (1.0 if components["situation"] else 0.0)
        + 0.20 * (1.0 if components["task"] else 0.0)
        + 0.30 * action_score
        + 0.25 * result_score
    )
    ownership_score = min(
        1.0,
        0.45 * (1.0 if components["ownership"] else 0.0)
        + 0.30 * action_score
        + 0.25 * (1.0 if components["reflection"] else 0.0),
    )
    completeness_score = min(
        1.0,
        0.30 * (1.0 if components["situation"] else 0.0)
        + 0.20 * (1.0 if components["task"] else 0.0)
        + 0.25 * action_score
        + 0.25 * result_score,
    )
    clarity_score = min(
        1.0,
        0.45 * max(similarity, semantic_equivalence)
        + 0.30 * structure_score
        + 0.15 * (1.0 if components["stakeholders"] else 0.0)
        + 0.10 * (1.0 if 45 <= answer_words <= 220 else 0.0),
    )

    scores = {
        "technical_depth": int(
            round(100 * min(1.0, 0.45 * max(similarity, semantic_equivalence) + 0.35 * ownership_score + 0.20 * behavioral_signal))
        ),
        "clarity": int(round(100 * clarity_score)),
        "completeness": int(
            round(
                100
                * min(
                    1.0,
                    0.45 * completeness_score
                    + 0.30 * behavioral_signal
                    + 0.25 * float(dimension_evidence.get("completeness", {}).get("coverage", 0.0)),
                )
            )
        ),
        "structure": int(
            round(
                100
                * min(
                    1.0,
                    0.60 * structure_score
                    + 0.25 * behavioral_signal
                    + 0.15 * float(dimension_evidence.get("structure", {}).get("coverage", 0.0)),
                )
            )
        ),
    }

    overall_score = int(round(sum(scores.values()) / len(scores)))
    if components["reflection"]:
        overall_score = min(100, overall_score + 3)
    if framework == "STAR":
        overall_score = min(100, overall_score + 4)
    elif framework == "partial":
        overall_score = max(0, overall_score - 6)

    strengths: list[str] = []
    weaknesses: list[str] = []

    if framework == "STAR":
        strengths.append("Clear STAR narrative with situation, task, action, and result.")
    elif framework == "SAR":
        strengths.append("The story has a usable SAR backbone with concrete action and outcome.")
        weaknesses.append("Make the task or responsibility explicit so the answer reads as full STAR.")
    else:
        weaknesses.append("The answer needs a clearer story arc: situation, task, action, and result.")

    if components["ownership"]:
        strengths.append("Ownership is visible - your individual contribution is identifiable.")
    else:
        weaknesses.append("Clarify what you specifically owned or decided instead of describing the team at a high level.")

    if components["result"]:
        strengths.append("The story lands with a concrete result or impact.")
    else:
        weaknesses.append("End with a measurable result, decision, or concrete outcome.")

    if components["reflection"]:
        strengths.append("Good reflection on what you learned or would carry forward.")
    else:
        weaknesses.append("Add a short reflection or lesson learned to show judgment.")

    if answer_words < 40:
        weaknesses.append("The story is too short to show depth - give enough context, action, and outcome.")
    elif answer_words > 260:
        weaknesses.append("The story is too long - compress it to the key beats of STAR.")

    degraded = embedding_error is not None
    confidence = _score_confidence(
        embedding_error=embedding_error,
        answer_words=answer_words,
        keyword_count=len(rubric.get("keywords", []) or []),
    )

    feedback = {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": [],
        "instant_feedback": _build_behavioral_instant_feedback(
            overall_score=overall_score,
            framework=framework,
            components=components,
            strengths=strengths,
            weaknesses=weaknesses,
        ),
        "notes": {
            "similarity_raw": similarity,
            "semantic_equivalence": semantic_equivalence,
            "answer_relevance": semantic_equivalence,
            "keyword_coverage": concept_cov,
            "keyword_coverage_raw": concept_cov_raw,
            "concept_coverage": concept_cov,
            "length_penalty": 1.0,
            "embedding_error": embedding_error,
            "degraded": degraded,
            "confidence": confidence,
            "dimension_evidence": dimension_evidence,
            "narrative_framework": framework,
            "quality_indicators": {
                "has_structure": framework != "partial",
                "has_examples": components["situation"],
                "behavioral_signal": round(behavioral_signal, 4),
                "star_components": components,
            },
            "ideal_snippet": ideal[:300] if ideal else None,
        },
    }
    return scores, overall_score, feedback


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
    role: str | None = None,
    weights: Dict = None,
) -> Tuple[Dict[str, int], int, Dict]:
    """
    Compute per-dimension integer scores (0-100), overall score, and feedback.

    - rubric: expected to have 'ideal_answer' and 'keywords' at minimum.
    - weights: optional weights for signals; defaults to similarity=0.6, concept=0.4
    """
    normalized_role = (role or "").strip()

    if weights is None:
        weights = {"similarity": 0.6, "keyword": 0.4}
        if normalized_role == "Behavioral":
            weights = {"similarity": 0.75, "keyword": 0.1}

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

    if normalized_role == "Behavioral":
        return _compute_behavioral_scores(
            answer_text,
            rubric,
            similarity,
            semantic_equivalence,
            concept_cov,
            concept_cov_raw,
            dimension_evidence,
            answer_words,
            embedding_error,
            ideal,
        )

    behavioral_signal = 0.0

    has_structure = any(
        word in answer_text.lower()
        for word in [
            "first",
            "then",
            "next",
            "finally",
            "however",
            "therefore",
            "while",
            "whereas",
            "in contrast",
            "by contrast",
        ]
    )
    has_examples = any(
        word in answer_text.lower()
        for word in ["example", "for instance", "such as", "like"]
    )
    quality_bonus = (0.1 if has_structure else 0) + (0.1 if has_examples else 0)
    if normalized_role == "Behavioral":
        quality_bonus += 0.15 * behavioral_signal

    base_score = 100 * min(1.0, weights["similarity"] * similarity + weights["keyword"] * concept_cov + quality_bonus)

    semantic_strength = max(similarity, semantic_equivalence)

    dimensions = ["technical_depth", "clarity", "completeness", "structure"]
    scores = {}
    for dim in dimensions:
        dim_kw = dim_keys.get(dim)
        if normalized_role == "Behavioral":
            dim_cov = float(dimension_evidence.get(dim, {}).get("coverage", 0.0))
            if dim == "structure":
                dim_score = 100 * (0.30 * semantic_strength + 0.35 * behavioral_signal + 0.35 * (1 if has_structure else 0))
            elif dim == "clarity":
                dim_score = 100 * (0.45 * semantic_strength + 0.30 * behavioral_signal + 0.25 * (1 if has_examples else 0))
            elif dim == "completeness":
                dim_score = 100 * (0.35 * semantic_strength + 0.30 * behavioral_signal + 0.35 * dim_cov)
            else:
                dim_score = 100 * (0.40 * semantic_strength + 0.35 * behavioral_signal + 0.25 * dim_cov)
        elif dim_kw:
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
    if normalized_role != "Behavioral":
        for concept in dimension_unmatched:
            if concept not in covered and concept not in missing:
                missing.append(concept)
    else:
        missing = []

    strengths = []
    weaknesses = []

    if semantic_equivalence > 0.7:
        strengths.append("Strong conceptual understanding demonstrated.")
    elif semantic_equivalence > 0.4:
        strengths.append("Good foundation, but could be more precise.")
    else:
        weaknesses.append("Answer lacks alignment with expected concepts.")

    if normalized_role == "Behavioral":
        if behavioral_signal > 0.75:
            strengths.append("Good use of a concrete example with clear ownership and outcome.")
        elif behavioral_signal > 0.45:
            strengths.append("The answer has a workable story, but it could be more specific about actions and impact.")
        else:
            weaknesses.append("The example feels vague - add a concrete situation, actions, and outcome.")
    elif concept_cov > 0.8:
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
        "instant_feedback": _build_instant_feedback(
            overall_score=overall_score,
            strengths=strengths,
            weaknesses=weaknesses,
            missing_keywords=missing,
            has_structure=has_structure,
            has_examples=has_examples,
        ),
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
                "behavioral_signal": round(behavioral_signal, 4),
            },
            "ideal_snippet": ideal[:300] if ideal else None,
        },
    }

    return scores, overall_score, feedback
