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
    Returns a float in [0.0, 1.0].
    """
    if not keywords:
        return 0.0
    tokens = set(_tokenize(answer_text))
    found = 0
    for kw in keywords:
        # match tokenized keyword(s) - split multi-word keywords on whitespace
        kw_tokens = _tokenize(kw)
        if all(k in tokens for k in kw_tokens):
            found += 1
    return found / len(keywords)


def compute_scores(
    answer_text: str,
    rubric: Dict,
    weights: Dict = None,
) -> Tuple[Dict[str, int], int, Dict]:
    """
    Compute per-dimension integer scores (0-100), overall score, and a feedback dict.

    - rubric: expected to have 'ideal_answer' and 'keywords' at minimum.
    - weights: optional weights for signals; defaults to similarity=0.65, keyword=0.35

    Returns:
      - scores: dict with four dimensions (ints 0-100)
      - overall: int 0-100
      - feedback: dict with strengths, weaknesses, missing_keywords, notes
    """
    # default weights
    if weights is None:
        weights = {"similarity": 0.65, "keyword": 0.35}

    ideal = rubric.get("ideal_answer", "")
    keywords = rubric.get("keywords", []) or []
    dim_keys = rubric.get("dimension_keywords", {}) or {}

    # 1) Semantic similarity
    # Embed both texts and compute cosine similarity in [ -1, 1 ], then map to [0,1]
    try:
        embs = embed_texts([answer_text, ideal])
        sim_raw = cosine_similarity_safe(embs[0], embs[1])
        similarity = max(0.0, (sim_raw + 1) / 2)  # make sure non-negative and scaled 0-1
    except Exception:
        # If embedding fails, fallback to zero similarity but keep service resilient
        similarity = 0.0

    # 2) Keyword coverage
    keyword_cov = keyword_coverage(answer_text, keywords)

    # 3) Combine into overall (0-100)
    overall_score = 100 * (weights["similarity"] * similarity + weights["keyword"] * keyword_cov)
    overall_score = int(round(max(0, min(100, overall_score))))

    # 4) Per-dimension scores: if dimension-specific keywords exist, measure coverage per-dimension
    # If not provided, fallback to overall_score for each dimension.
    dimensions = ["technical_depth", "clarity", "completeness", "structure"]
    scores = {}
    for dim in dimensions:
        dim_kw = dim_keys.get(dim)
        if dim_kw:
            dim_cov = keyword_coverage(answer_text, dim_kw)
            # approximate dimension score by blending similarity & dim keyword coverage
            score = 100 * (0.6 * similarity + 0.4 * dim_cov)
        else:
            score = overall_score
        scores[dim] = int(round(max(0, min(100, score))))

    # 5) Feedback: strengths, weaknesses, missing keywords
    missing = []
    tokens = set(_tokenize(answer_text))
    for kw in keywords:
        kw_tokens = _tokenize(kw)
        if not all(k in tokens for k in kw_tokens):
            missing.append(kw)

    strengths = []
    weaknesses = []
    if similarity > 0.6:
        strengths.append("Answer semantically aligns with the ideal response.")
    else:
        weaknesses.append("Answer could be expanded or clarified to better match the ideal response.")

    if keyword_cov > 0.7:
        strengths.append("Good coverage of key concepts.")
    else:
        weaknesses.append("Missing some key concepts from the rubric.")

    feedback = {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing,
        "notes": {
            "similarity_raw": similarity,
            "keyword_coverage": keyword_cov,
            "ideal_snippet": ideal[:300] if ideal else None,
        },
    }

    return scores, overall_score, feedback
