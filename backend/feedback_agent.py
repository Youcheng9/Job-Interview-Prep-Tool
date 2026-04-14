from __future__ import annotations

import json
import os
from urllib import error, request

from pydantic import BaseModel, Field, ValidationError, field_validator

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
AI_FEEDBACK_ENABLED = os.getenv("AI_FEEDBACK_ENABLED", "true").lower() == "true"
AI_FEEDBACK_TIMEOUT_SECONDS = int(os.getenv("AI_FEEDBACK_TIMEOUT_SECONDS", "90"))
AI_FEEDBACK_FAST_MODE = os.getenv("AI_FEEDBACK_FAST_MODE", "true").lower() == "true"
AI_FEEDBACK_MAX_TOKENS = int(os.getenv("AI_FEEDBACK_MAX_TOKENS", "220"))


class FeedbackAgentError(RuntimeError):
    pass


class AIFeedback(BaseModel):
    summary: str = Field(min_length=10)
    strengths: list[str] = Field(min_length=1)
    weaknesses: list[str] = Field(min_length=1)
    improvements: list[str] = Field(min_length=1)
    improved_answer: str = Field(min_length=10)
    next_focus: str = Field(min_length=3)

    @field_validator("strengths", "weaknesses", "improvements")
    @classmethod
    def validate_lists(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            value = [part.strip(" -•\t") for part in value.split("\n")]
        cleaned = [item.strip() for item in value if item and item.strip()]
        if not cleaned:
            raise ValueError("list must not be empty")
        return cleaned


def feedback_enabled() -> bool:
    return AI_FEEDBACK_ENABLED


def generate_agentic_feedback(
    *,
    role: str,
    question_prompt: str,
    answer_text: str,
    rubric: dict,
    scores: dict[str, int],
    overall: int,
    feedback: dict,
) -> dict:
    if not AI_FEEDBACK_ENABLED:
        raise FeedbackAgentError("AI feedback is disabled")

    prompt = build_feedback_prompt(
        role=role,
        question_prompt=question_prompt,
        answer_text=answer_text,
        rubric=rubric,
        scores=scores,
        overall=overall,
        feedback=feedback,
    )
    raw = call_ollama(prompt)
    parsed = parse_feedback_json(raw)
    return AIFeedback.model_validate(parsed).model_dump()


def build_feedback_prompt(
    *,
    role: str,
    question_prompt: str,
    answer_text: str,
    rubric: dict,
    scores: dict[str, int],
    overall: int,
    feedback: dict,
) -> str:
    keywords = rubric.get("keywords", [])[:6]
    missing_keywords = (feedback.get("missing_keywords", []) or [])[:4]
    strengths = (feedback.get("strengths", []) or [])[:2]
    weaknesses = (feedback.get("weaknesses", []) or [])[:2]

    if AI_FEEDBACK_FAST_MODE:
        return f"""
You are an interview coach. Return valid JSON only.

Question: {question_prompt}
Candidate answer: {answer_text}
Ideal answer summary: {rubric.get("ideal_answer", "")[:280]}
Role: {role}
Overall score: {overall}
Dimension scores: {json.dumps(scores)}
Expected keywords: {json.dumps(keywords)}
Missing keywords: {json.dumps(missing_keywords)}
Known strengths: {json.dumps(strengths)}
Known weaknesses: {json.dumps(weaknesses)}

Return exactly:
{{
  "summary": "1 to 2 sentences",
  "strengths": ["item", "item"],
  "weaknesses": ["item", "item"],
  "improvements": ["item", "item"],
  "improved_answer": "2 to 4 concise sentences",
  "next_focus": "short phrase"
}}

Keep every field concise and specific.
""".strip()

    return f"""
You are an interview coach agent. Your job is to analyze an answer, identify the most important improvement opportunities, and produce practical next-step coaching.

Return valid JSON only. Do not include markdown. Do not include commentary outside the JSON object.

You are given:
- role: {role}
- interview question: {question_prompt}
- candidate answer: {answer_text}
- ideal answer: {rubric.get("ideal_answer", "")}
- rubric keywords: {json.dumps(keywords)}
- current overall score: {overall}
- dimension scores: {json.dumps(scores)}
- existing deterministic strengths: {json.dumps(strengths)}
- existing deterministic weaknesses: {json.dumps(weaknesses)}
- missing keywords: {json.dumps(missing_keywords)}

Return exactly this JSON shape:
{{
  "summary": "2 to 4 sentences that explain the answer quality overall.",
  "strengths": ["specific strength", "specific strength"],
  "weaknesses": ["specific weakness", "specific weakness"],
  "improvements": ["actionable step", "actionable step", "actionable step"],
  "improved_answer": "A stronger example answer written in a concise but polished way.",
  "next_focus": "Short phrase describing the highest-value area to practice next"
}}

Requirements:
- Be specific to the candidate answer, not generic.
- The strengths should reflect what the candidate actually did well.
- The weaknesses should focus on the most important gaps.
- The improvements should be concrete and immediately actionable.
- The improved_answer should sound like a stronger interview response, not a rubric.
- Keep the tone constructive and direct.
""".strip()


def call_ollama(prompt: str) -> str:
    body = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_predict": AI_FEEDBACK_MAX_TOKENS,
            },
        }
    ).encode("utf-8")

    req = request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=AI_FEEDBACK_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.URLError as exc:
        raise FeedbackAgentError(f"Could not reach Ollama at {OLLAMA_URL}") from exc
    except json.JSONDecodeError as exc:
        raise FeedbackAgentError("Ollama returned non-JSON response") from exc

    text = payload.get("response")
    if not text or not isinstance(text, str):
        raise FeedbackAgentError("Ollama response did not include generated feedback")
    return text


def parse_feedback_json(raw: str) -> dict:
    text = raw.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise FeedbackAgentError("LLM output was not valid JSON")
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise FeedbackAgentError("LLM output could not be parsed into JSON") from exc

    if not isinstance(parsed, dict):
        raise FeedbackAgentError("LLM output must be a JSON object")

    normalized = normalize_feedback_payload(parsed)

    try:
        AIFeedback.model_validate(normalized)
    except ValidationError as exc:
        raise FeedbackAgentError(f"LLM feedback schema invalid: {exc}") from exc

    return normalized


def normalize_feedback_payload(payload: dict) -> dict:
    summary = pick_first_string(payload, "summary", "overview", "coach_summary", "feedback")
    strengths = coerce_list(payload.get("strengths"))
    weaknesses = coerce_list(payload.get("weaknesses"))
    improvements = coerce_list(payload.get("improvements") or payload.get("action_items") or payload.get("next_steps"))
    improved_answer = pick_first_string(payload, "improved_answer", "better_answer", "sample_answer", "model_answer")
    next_focus = pick_first_string(payload, "next_focus", "focus_area", "priority_area")

    if not summary:
        summary = "The answer shows some promise, but it needs clearer depth, completeness, and structure."
    if not strengths:
        strengths = ["You attempted the core question and provided a direction for your answer."]
    if not weaknesses:
        weaknesses = ["Important details or tradeoffs were missing from the explanation."]
    if not improvements:
        improvements = ["Add one concrete example.", "State the key tradeoff explicitly.", "End with a concise takeaway."]
    if not improved_answer:
        improved_answer = summary
    if not next_focus:
        next_focus = "Answer structure"

    return {
        "summary": summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvements": improvements,
        "improved_answer": improved_answer,
        "next_focus": next_focus,
    }


def coerce_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        if "," in value and "\n" not in value:
            parts = value.split(",")
        else:
            parts = value.split("\n")
        return [part.strip(" -•\t") for part in parts if part.strip(" -•\t")]
    return []


def pick_first_string(payload: dict, *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""
