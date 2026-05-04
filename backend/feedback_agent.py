from __future__ import annotations

import json
import logging
import os
import socket
from urllib import error, request

from pydantic import BaseModel, Field, ValidationError, field_validator

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
AI_FEEDBACK_MODEL = os.getenv("AI_FEEDBACK_MODEL", OLLAMA_MODEL)
AI_FEEDBACK_ENABLED = os.getenv("AI_FEEDBACK_ENABLED", "true").lower() == "true"
AI_FEEDBACK_TIMEOUT_SECONDS = int(os.getenv("AI_FEEDBACK_TIMEOUT_SECONDS", "30"))
AI_FEEDBACK_FAST_MODE = os.getenv("AI_FEEDBACK_FAST_MODE", "true").lower() == "true"
AI_FEEDBACK_MAX_TOKENS = int(os.getenv("AI_FEEDBACK_MAX_TOKENS", "120"))
AI_FEEDBACK_CHAT_MAX_TOKENS = int(os.getenv("AI_FEEDBACK_CHAT_MAX_TOKENS", "180"))
AI_FEEDBACK_PROMPT_ANSWER_CHARS = int(os.getenv("AI_FEEDBACK_PROMPT_ANSWER_CHARS", "650"))
AI_FEEDBACK_PROMPT_IDEAL_CHARS = int(os.getenv("AI_FEEDBACK_PROMPT_IDEAL_CHARS", "220"))
AI_FEEDBACK_NUM_CTX = int(os.getenv("AI_FEEDBACK_NUM_CTX", "1024"))
AI_FEEDBACK_RETRY_WITH_PLAIN_JSON = os.getenv("AI_FEEDBACK_RETRY_WITH_PLAIN_JSON", "true").lower() == "true"
AI_FEEDBACK_MAX_RETRIES = max(1, int(os.getenv("AI_FEEDBACK_MAX_RETRIES", "2")))

logger = logging.getLogger(__name__)


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


AI_FEEDBACK_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "improvements": {"type": "array", "items": {"type": "string"}},
        "improved_answer": {"type": "string"},
        "next_focus": {"type": "string"},
    },
    "required": [
        "summary",
        "strengths",
        "weaknesses",
        "improvements",
        "improved_answer",
        "next_focus",
    ],
}


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
    errors: list[str] = []

    for attempt in range(1, AI_FEEDBACK_MAX_RETRIES + 1):
        for use_schema_format in (True, False):
            if not use_schema_format and not AI_FEEDBACK_RETRY_WITH_PLAIN_JSON:
                continue
            try:
                raw = call_ollama(prompt, use_schema_format=use_schema_format)
                parsed = parse_feedback_json(raw)
                return AIFeedback.model_validate(parsed).model_dump()
            except FeedbackAgentError as exc:
                mode = "schema" if use_schema_format else "plain-json"
                logger.warning("AI feedback attempt %s via %s failed: %s", attempt, mode, exc)
                errors.append(str(exc))

    raise FeedbackAgentError(errors[-1] if errors else "AI feedback generation failed")


def build_fallback_feedback(
    *,
    answer_text: str,
    feedback: dict,
) -> dict:
    strengths = (feedback.get("strengths", []) or [])[:2]
    weaknesses = (feedback.get("weaknesses", []) or [])[:2]
    missing_keywords = (feedback.get("missing_keywords", []) or [])[:2]
    strength_text = " ".join(strengths).lower()
    weakness_text = " ".join(weaknesses).lower()

    if not strengths:
        strengths = ["You addressed the prompt and gave the evaluator something concrete to assess."]
    if not weaknesses:
        weaknesses = ["The answer needs clearer detail and stronger explanation of key ideas."]

    improvements = []
    if missing_keywords:
        improvements.append(f"Explicitly mention {', '.join(missing_keywords)}.")
    if "example" in weakness_text:
        improvements.append("Add one concrete example or tradeoff to support your explanation.")
    if "organizing" in weakness_text or "structure" in weakness_text:
        improvements.append("Use a short structure: answer, reasoning, example, takeaway.")
    if not improvements:
        improvements.append("Clarify the main point earlier and make the explanation more specific.")
    if not any("structure" in item.lower() or "organizing" in item.lower() for item in improvements) and "structured" not in strength_text:
        improvements.append("End with a short takeaway that ties your answer together.")
    improvements = improvements[:2]

    answer_excerpt = _compact_text(answer_text, limit=220)
    improved_answer = "Lead with the core answer, explain why it matters, and make the explanation more specific."
    if "example" in weakness_text:
        improved_answer += " Add one concrete example or tradeoff."
    elif "structured" not in strength_text:
        improved_answer += " End with a concise takeaway."
    if answer_excerpt:
        improved_answer += f" Original answer focus: {answer_excerpt}"

    next_focus = "Specificity"
    if missing_keywords:
        next_focus = missing_keywords[0]
    elif "structure" in weakness_text or "organizing" in weakness_text:
        next_focus = "Answer structure"
    elif "example" in weakness_text:
        next_focus = "Concrete examples"

    return {
        "summary": "AI coach was unavailable, so this is fast fallback guidance based on your score and rubric gaps.",
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvements": improvements,
        "improved_answer": improved_answer,
        "next_focus": next_focus,
        "label": "fallback",
    }


def _compact_text(text: str, *, limit: int) -> str:
    compacted = " ".join((text or "").split())
    if len(compacted) <= limit:
        return compacted
    return compacted[: max(0, limit - 3)].rstrip() + "..."


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
    strengths = (feedback.get("strengths", []) or [])[:1]
    weaknesses = (feedback.get("weaknesses", []) or [])[:1]
    compact_question = _compact_text(question_prompt, limit=220)
    compact_answer = _compact_text(answer_text, limit=AI_FEEDBACK_PROMPT_ANSWER_CHARS)
    compact_ideal = _compact_text(rubric.get("ideal_answer", ""), limit=AI_FEEDBACK_PROMPT_IDEAL_CHARS)

    if AI_FEEDBACK_FAST_MODE:
        return f"""
Return JSON only.

Role: {role}
Question: {compact_question}
Answer: {compact_answer}
Ideal: {compact_ideal}
Overall: {overall}
Scores: {json.dumps(scores, separators=(",", ":"))}
Expected keywords: {json.dumps(keywords, separators=(",", ":"))}
Missing keywords: {json.dumps(missing_keywords, separators=(",", ":"))}
Known strengths: {json.dumps(strengths, separators=(",", ":"))}
Known weaknesses: {json.dumps(weaknesses, separators=(",", ":"))}

Schema:
{{
  "summary": "1 short sentence",
  "strengths": ["item"],
  "weaknesses": ["item"],
  "improvements": ["item","item"],
  "improved_answer": "1 to 2 concise sentences",
  "next_focus": "short phrase"
}}

Keep every value short, specific, and grounded in the answer.
""".strip()

    return f"""
You are an interview coach agent. Your job is to analyze an answer, identify the most important improvement opportunities, and produce practical next-step coaching.

Return valid JSON only. Do not include markdown. Do not include commentary outside the JSON object.

You are given:
- role: {role}
- interview question: {compact_question}
- candidate answer: {compact_answer}
- ideal answer: {compact_ideal}
- rubric keywords: {json.dumps(keywords, separators=(",", ":"))}
- current overall score: {overall}
- dimension scores: {json.dumps(scores, separators=(",", ":"))}
- existing deterministic strengths: {json.dumps(strengths, separators=(",", ":"))}
- existing deterministic weaknesses: {json.dumps(weaknesses, separators=(",", ":"))}
- missing keywords: {json.dumps(missing_keywords, separators=(",", ":"))}

Return exactly this JSON shape:
{{
  "summary": "1 to 2 sentences that explain the answer quality overall.",
  "strengths": ["specific strength"],
  "weaknesses": ["specific weakness"],
  "improvements": ["actionable step", "actionable step"],
  "improved_answer": "A stronger answer in 1 to 2 concise sentences.",
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


def call_ollama(prompt: str, *, use_schema_format: bool) -> str:
    body = json.dumps(
        {
            "model": AI_FEEDBACK_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": AI_FEEDBACK_JSON_SCHEMA if use_schema_format else "json",
            "options": {
                "temperature": 0.2,
                "num_predict": AI_FEEDBACK_MAX_TOKENS,
                "num_ctx": AI_FEEDBACK_NUM_CTX,
            },
        }
    ).encode("utf-8")

    req = request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    timeout = None if AI_FEEDBACK_TIMEOUT_SECONDS <= 0 else AI_FEEDBACK_TIMEOUT_SECONDS

    try:
        with request.urlopen(req, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(details)
            detail_message = parsed.get("error") or parsed.get("message") or details
        except json.JSONDecodeError:
            detail_message = details or str(exc)
        raise FeedbackAgentError(f"Ollama request failed: {detail_message}") from exc
    except error.URLError as exc:
        raise FeedbackAgentError(f"Could not reach Ollama at {OLLAMA_URL}") from exc
    except socket.timeout as exc:
        raise FeedbackAgentError("Ollama timed out while generating feedback") from exc
    except json.JSONDecodeError as exc:
        raise FeedbackAgentError("Ollama returned non-JSON response") from exc

    if payload.get("error"):
        raise FeedbackAgentError(str(payload["error"]))

    text = payload.get("response")
    if not text or not isinstance(text, str):
        raise FeedbackAgentError("Ollama response did not include generated feedback")
    return text


def call_ollama_text(prompt: str, *, max_tokens: int) -> str:
    body = json.dumps(
        {
            "model": AI_FEEDBACK_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.25,
                "num_predict": max_tokens,
                "num_ctx": AI_FEEDBACK_NUM_CTX,
            },
        }
    ).encode("utf-8")

    req = request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    timeout = None if AI_FEEDBACK_TIMEOUT_SECONDS <= 0 else AI_FEEDBACK_TIMEOUT_SECONDS

    try:
        with request.urlopen(req, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(details)
            detail_message = parsed.get("error") or parsed.get("message") or details
        except json.JSONDecodeError:
            detail_message = details or str(exc)
        raise FeedbackAgentError(f"Ollama request failed: {detail_message}") from exc
    except error.URLError as exc:
        raise FeedbackAgentError(f"Could not reach Ollama at {OLLAMA_URL}") from exc
    except socket.timeout as exc:
        raise FeedbackAgentError("Ollama timed out while generating feedback") from exc
    except json.JSONDecodeError as exc:
        raise FeedbackAgentError("Ollama returned non-JSON response") from exc

    if payload.get("error"):
        raise FeedbackAgentError(str(payload["error"]))

    text = payload.get("response")
    if not text or not isinstance(text, str):
        raise FeedbackAgentError("Ollama response did not include generated feedback")
    return text.strip()


def parse_feedback_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start_array = text.find("[")
        start = text.find("{")
        end = text.rfind("}")
        if (start == -1 or end == -1 or end <= start) and start_array != -1:
            array_end = text.rfind("]")
            if array_end > start_array:
                try:
                    parsed_array = json.loads(text[start_array : array_end + 1])
                    if isinstance(parsed_array, list) and parsed_array and isinstance(parsed_array[0], dict):
                        parsed = parsed_array[0]
                    else:
                        raise FeedbackAgentError("LLM output was not valid JSON")
                except json.JSONDecodeError as exc:
                    raise FeedbackAgentError("LLM output could not be parsed into JSON") from exc
            else:
                raise FeedbackAgentError("LLM output was not valid JSON")
        elif start == -1 or end == -1 or end <= start:
            raise FeedbackAgentError("LLM output was not valid JSON")
        try:
            if "parsed" not in locals():
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


def generate_feedback_chat_reply(
    *,
    role: str,
    question_prompt: str,
    answer_text: str,
    rubric: dict,
    scores: dict[str, int],
    overall: int,
    feedback: dict,
    history: list[dict[str, str]],
) -> str:
    if not AI_FEEDBACK_ENABLED:
        raise FeedbackAgentError("AI feedback is disabled")

    prompt = build_feedback_chat_prompt(
        role=role,
        question_prompt=question_prompt,
        answer_text=answer_text,
        rubric=rubric,
        scores=scores,
        overall=overall,
        feedback=feedback,
        history=history,
    )
    reply = call_ollama_text(prompt, max_tokens=AI_FEEDBACK_CHAT_MAX_TOKENS)
    if not reply:
        raise FeedbackAgentError("Ollama did not return a chat reply")
    return reply


def build_fallback_chat_reply(*, user_message: str, feedback: dict) -> str:
    ai_feedback = feedback.get("ai_feedback") or {}
    improvements = ai_feedback.get("improvements") or feedback.get("weaknesses") or []
    missing = feedback.get("missing_keywords") or []
    lower_message = user_message.lower()

    if "rewrite" in lower_message or "improve" in lower_message:
        focus = ", ".join(missing[:2]) if missing else "the missing key concepts"
        return (
            "A stronger version should lead with the direct answer, explain the reasoning or tradeoff, "
            f"and explicitly mention {focus}."
        )
    if "why" in lower_message and improvements:
        return f"That score reflects the main issue the scorer found: {improvements[0]}"
    if "missing" in lower_message and missing:
        return f"The highest-value concepts to add are: {', '.join(missing[:3])}."
    if improvements:
        return f"The fastest improvement is to focus on this next step: {improvements[0]}"
    return "The answer needs a clearer direct conclusion, stronger supporting detail, and one concrete example."


def build_feedback_chat_prompt(
    *,
    role: str,
    question_prompt: str,
    answer_text: str,
    rubric: dict,
    scores: dict[str, int],
    overall: int,
    feedback: dict,
    history: list[dict[str, str]],
) -> str:
    compact_question = _compact_text(question_prompt, limit=220)
    compact_answer = _compact_text(answer_text, limit=AI_FEEDBACK_PROMPT_ANSWER_CHARS)
    compact_ideal = _compact_text(rubric.get("ideal_answer", ""), limit=AI_FEEDBACK_PROMPT_IDEAL_CHARS)
    keywords = rubric.get("keywords", [])[:8]
    missing_keywords = (feedback.get("missing_keywords", []) or [])[:5]
    ai_feedback = feedback.get("ai_feedback") or {}
    transcript = "\n".join(
        f"{'User' if item.get('role') == 'user' else 'Coach'}: {_compact_text(item.get('content', ''), limit=260)}"
        for item in history[-8:]
    )

    return f"""
You are an interview coach continuing a short follow-up conversation about one submitted answer.

Rules:
- Stay grounded in the provided answer, score breakdown, and rubric.
- Be concise, practical, and specific.
- Keep the response under 120 words unless asked to rewrite the answer.
- Do not invent claims about the user's answer.
- If asked to rewrite, provide 2 to 4 sentences in an interview-ready tone.
- Focus on one or two improvements, not a full lecture.

Role: {role}
Question: {compact_question}
Candidate answer: {compact_answer}
Ideal answer: {compact_ideal}
Overall score: {overall}
Dimension scores: {json.dumps(scores, separators=(",", ":"))}
Expected keywords: {json.dumps(keywords, separators=(",", ":"))}
Missing keywords: {json.dumps(missing_keywords, separators=(",", ":"))}
Known weaknesses: {json.dumps(feedback.get("weaknesses", [])[:2], separators=(",", ":"))}
AI summary: {_compact_text(ai_feedback.get("summary", ""), limit=200)}

Conversation:
{transcript}

Reply as the coach to the latest user message only.
""".strip()
