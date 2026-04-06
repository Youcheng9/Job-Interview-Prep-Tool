# backend/ml/scorer.py
"""
Simple scoring pipeline for InterviewPrep.

Design goals:
- Deterministic and explainable (no LLM required)
- Two signals:
  1) Semantic similarity between user answer and ideal answer (embedding cosine)
  2) Keyword coverage (how many rubric keywords are present)
- Combine them into:
  - per-dimension scores dict (technical_depth, clarity, completeness, structure)
  - overall score (0-100)
  - feedback with missing keywords and short strengths/weaknesses

Notes:
- Questions should include a `rubric` JSON with at least:
    {
      "ideal_answer": "a short canonical answer",
      "keywords": ["word1","word2",...],
      "dimension_keywords": {   # optional: per-dimension keyword lists
         "technical_depth": [...],
         "clarity": [...],
         "completeness": [...],
         "structure": [...]
      }
    }
- We use "all-MiniLM-L6-v2" embeddings for speed/accuracy balance.
"""

from typing import List, Dict, Tuple
import re

from backend.ml.embedder import cosine_similarity_safe, embed_texts


def _tokenize(text: str) -> List[str]:
    """
    Simple tokenization: lowercase + word boundaries.
    This is intentionally simple and cheap.
    """
    return re.findall(r"\b[a-zA-Z0-9_+-]+\b", text.lower())


def keyword_coverage(answer_text: str, keywords: List[str]) -> float:
    """
    Compute fraction of rubric keywords present in the answer.
    Enhanced with fuzzy matching and partial credit.
    Returns a float in [0.0, 1.0].
    """
    if not keywords:
        return 0.0

    tokens = set(_tokenize(answer_text.lower()))
    found = 0.0

    for kw in keywords:
        kw_lower = kw.lower()
        kw_tokens = _tokenize(kw_lower)

        # Exact match gets full credit
        if all(k in tokens for k in kw_tokens):
            found += 1.0
        else:
            # Partial credit for fuzzy matching
            match_count = sum(1 for k in kw_tokens if any(k in t or t in k for t in tokens))
            if match_count > 0:
                found += match_count / len(kw_tokens) * 0.7  # Partial credit

    return min(1.0, found / len(keywords))


def compute_scores(
    answer_text: str,
    rubric: Dict,
    weights: Dict = None,
) -> Tuple[Dict[str, int], int, Dict]:
    """
    Compute per-dimension integer scores (0-100), overall score, and a feedback dict.
    Enhanced with length penalties, better calibration, and quality checks.

    - rubric: expected to have 'ideal_answer' and 'keywords' at minimum.
    - weights: optional weights for signals; defaults to similarity=0.6, keyword=0.4

    Returns:
      - scores: dict with four dimensions (ints 0-100)
      - overall: int 0-100
      - feedback: dict with strengths, weaknesses, missing_keywords, notes
    """
    # default weights - adjusted for more balanced scoring
    if weights is None:
        weights = {"similarity": 0.6, "keyword": 0.4}

    ideal = rubric.get("ideal_answer", "")
    keywords = rubric.get("keywords", []) or []
    dim_keys = rubric.get("dimension_keywords", {}) or {}

    # Length analysis - penalize very short answers
    answer_words = len(answer_text.split())
    ideal_words = len(ideal.split())
    length_ratio = min(answer_words / max(ideal_words, 10), 2.0)  # Cap at 2x ideal length
    length_penalty = max(0.3, min(1.0, length_ratio * 0.8))  # Penalty for too short answers

    # 1) Semantic similarity with length consideration
    try:
        embs = embed_texts([answer_text, ideal])
        sim_raw = cosine_similarity_safe(embs[0], embs[1])
        similarity = max(0.0, (sim_raw + 1) / 2)  # Scale to [0,1]
        # Apply length penalty to similarity
        similarity = similarity * length_penalty
    except Exception:
        similarity = 0.0

    # 2) Keyword coverage
    keyword_cov = keyword_coverage(answer_text, keywords)

    # 3) Quality checks
    has_structure = any(word in answer_text.lower() for word in ['first', 'then', 'next', 'finally', 'however', 'therefore'])
    has_examples = any(word in answer_text.lower() for word in ['example', 'for instance', 'such as', 'like'])
    quality_bonus = (0.1 if has_structure else 0) + (0.1 if has_examples else 0)

    # 4) Combine into overall score with more realistic calibration
    base_score = weights["similarity"] * similarity + weights["keyword"] * keyword_cov
    overall_score = 100 * min(1.0, base_score + quality_bonus)

    # More realistic calibration: even good answers shouldn't get 100
    if overall_score > 95:
        overall_score = 95  # Reserve 95-100 for near-perfect answers
    elif overall_score > 85:
        overall_score = min(overall_score, 92)  # Good answers: 85-92

    overall_score = int(round(max(0, min(100, overall_score))))

    # 5) Per-dimension scores with better logic
    dimensions = ["technical_depth", "clarity", "completeness", "structure"]
    scores = {}
    for dim in dimensions:
        dim_kw = dim_keys.get(dim)
        if dim_kw:
            dim_cov = keyword_coverage(answer_text, dim_kw)
            # Dimension-specific scoring with quality considerations
            if dim == "structure":
                dim_score = 100 * (0.5 * similarity + 0.3 * dim_cov + 0.2 * (1 if has_structure else 0))
            elif dim == "clarity":
                clarity_bonus = 0.1 if has_examples else 0
                dim_score = 100 * (0.5 * similarity + 0.3 * dim_cov + clarity_bonus)
            else:
                dim_score = 100 * (0.5 * similarity + 0.5 * dim_cov)
        else:
            # Fallback with dimension-specific adjustments
            if dim == "structure":
                dim_score = overall_score * (0.8 + 0.2 * (1 if has_structure else 0))
            elif dim == "clarity":
                dim_score = overall_score * (0.9 + 0.1 * (1 if has_examples else 0))
            else:
                dim_score = overall_score

        scores[dim] = int(round(max(0, min(100, dim_score))))

    # 6) Enhanced feedback
    missing = []
    tokens = set(_tokenize(answer_text))
    for kw in keywords:
        kw_tokens = _tokenize(kw)
        if not all(k in tokens for k in kw_tokens):
            missing.append(kw)

    strengths = []
    weaknesses = []

    # More nuanced feedback based on actual performance
    if similarity > 0.7:
        strengths.append("Strong conceptual understanding demonstrated.")
    elif similarity > 0.4:
        strengths.append("Good foundation, but could be more precise.")
    else:
        weaknesses.append("Answer lacks alignment with expected concepts.")

    if keyword_cov > 0.8:
        strengths.append("Excellent coverage of key technical terms.")
    elif keyword_cov > 0.5:
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

    feedback = {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing,
        "notes": {
            "similarity_raw": similarity,
            "keyword_coverage": keyword_cov,
            "length_penalty": length_penalty,
            "quality_indicators": {
                "has_structure": has_structure,
                "has_examples": has_examples
            },
            "ideal_snippet": ideal[:300] if ideal else None,
        },
    }

    return scores, overall_score, feedback
