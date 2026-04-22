from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import random
from urllib import error, request

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

ROOT_DIR = Path(__file__).resolve().parent
ENV_PATH = ROOT_DIR / ".env"
QUESTIONS_PATH = ROOT_DIR / "data" / "questions.json"

load_dotenv(dotenv_path=ENV_PATH)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT_SECONDS = int(os.getenv("AI_FEEDBACK_TIMEOUT_SECONDS", "90"))
OLLAMA_MAX_TOKENS = int(os.getenv("QUESTION_GENERATION_MAX_TOKENS", "1800"))
MAX_GENERATION_ATTEMPTS = int(os.getenv("QUESTION_GENERATION_MAX_ATTEMPTS", "8"))

VALID_ROLES = {"SWE", "DataScience", "PM", "Behavioral"}
VALID_LEVELS = {"intern", "new_grad"}


class QuestionGenerationError(RuntimeError):
    pass


class RubricModel(BaseModel):
    ideal_answer: str = Field(min_length=20)
    keywords: list[str] = Field(min_length=3)
    dimension_keywords: dict[str, list[str]] = Field(default_factory=dict)

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        if len(cleaned) < 3:
            raise ValueError("keywords must include at least 3 items")
        return cleaned

    @field_validator("dimension_keywords")
    @classmethod
    def validate_dimension_keywords(cls, value: dict[str, list[str]]) -> dict[str, list[str]]:
        normalized: dict[str, list[str]] = {}
        for key, items in value.items():
            cleaned = [item.strip() for item in items if item and item.strip()]
            if cleaned:
                normalized[key] = cleaned
        return normalized


class QuestionModel(BaseModel):
    role: str
    level: str
    prompt: str = Field(min_length=12)
    rubric: RubricModel

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return cleaned

    @field_validator("level")
    @classmethod
    def validate_level(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in VALID_LEVELS:
            raise ValueError(f"level must be one of {sorted(VALID_LEVELS)}")
        return cleaned

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if cleaned.endswith("?") is False:
            cleaned = f"{cleaned}?"
        return cleaned


def looks_like_question_object(value: object) -> bool:
    return isinstance(value, dict) and {"role", "level", "prompt", "rubric"}.issubset(value.keys())


def build_prompt(
    *,
    role: str,
    level: str,
    count: int,
    topic: str | None,
    banned_prompts: list[str] | None = None,
) -> str:
    topic_line = f"Focus area: {topic}\n" if topic else ""
    freshness_hint = random.randint(1000, 9999)
    banned_section = ""
    if banned_prompts:
        banned_lines = "\n".join(f'- "{prompt}"' for prompt in banned_prompts[:50])
        banned_section = f"""
Do not generate any prompt that matches or closely paraphrases these existing prompts:
{banned_lines}
"""
    return f"""
You are generating interview practice questions for a coding interview prep application.

Return valid JSON only.
Return a JSON array of exactly {count} objects.

Each object must match this schema exactly:
{{
  "role": "{role}",
  "level": "{level}",
  "prompt": "A concise interview question ending with a question mark",
  "rubric": {{
    "ideal_answer": "A strong 2 to 5 sentence answer summary",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "dimension_keywords": {{
      "technical_depth": ["item", "item"],
      "clarity": ["item", "item"],
      "completeness": ["item", "item"],
      "structure": ["item", "item"]
    }}
  }}
}}

Requirements:
- Role must always be "{role}".
- Level must always be "{level}".
- Keep prompts realistic for {role} candidates at the {level} level.
- Make all prompts distinct from one another.
- Avoid repeating common textbook prompts unless they are rewritten in a meaningfully different way.
- Do not include numbering or commentary.
- Keywords should be specific and useful for scoring.
- dimension_keywords should contain short phrases, not sentences.
- Avoid markdown fences.
- Internal variation hint: {freshness_hint}
{topic_line}
{banned_section}
Return JSON only.
""".strip()


def call_ollama(prompt: str) -> str:
    body = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.5,
                "num_predict": OLLAMA_MAX_TOKENS,
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
        with request.urlopen(req, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except error.URLError as exc:
        raise QuestionGenerationError(f"Could not reach Ollama at {OLLAMA_URL}") from exc
    except json.JSONDecodeError as exc:
        raise QuestionGenerationError("Ollama returned non-JSON output") from exc

    text = payload.get("response")
    if not isinstance(text, str) or not text.strip():
        raise QuestionGenerationError("Ollama response did not include generated questions")
    return text


def extract_question_list(parsed: object) -> list[object]:
    if isinstance(parsed, list):
        return parsed

    if looks_like_question_object(parsed):
        return [parsed]

    if isinstance(parsed, dict):
        for key in ("questions", "items", "data", "results"):
            value = parsed.get(key)
            if isinstance(value, list):
                return value
            if looks_like_question_object(value):
                return [value]

        nested_lists: list[object] = []
        for value in parsed.values():
            if isinstance(value, list):
                nested_lists.extend(value)
        if nested_lists:
            return nested_lists

    raise QuestionGenerationError(
        "LLM output did not contain recognizable question objects"
    )


def parse_generated_questions(raw: str) -> list[QuestionModel]:
    text = raw.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        array_start = text.find("[")
        array_end = text.rfind("]")
        obj_start = text.find("{")
        obj_end = text.rfind("}")

        candidate_payloads: list[str] = []
        if array_start != -1 and array_end != -1 and array_end > array_start:
            candidate_payloads.append(text[array_start : array_end + 1])
        if obj_start != -1 and obj_end != -1 and obj_end > obj_start:
            candidate_payloads.append(text[obj_start : obj_end + 1])

        parsed = None
        for candidate in candidate_payloads:
            try:
                parsed = json.loads(candidate)
                break
            except json.JSONDecodeError:
                continue

        if parsed is None:
            raise QuestionGenerationError("LLM output could not be parsed into JSON")

    question_items = extract_question_list(parsed)

    if not question_items:
        raise QuestionGenerationError("LLM returned an empty question list")

    try:
        return [QuestionModel.model_validate(item) for item in question_items]
    except ValidationError as exc:
        raise QuestionGenerationError(f"Generated questions failed validation: {exc}") from exc


def shorten_for_debug(text: str, max_chars: int = 500) -> str:
    compact = " ".join(text.split())
    if len(compact) <= max_chars:
        return compact
    return compact[:max_chars] + "..."


def load_existing_questions() -> list[dict]:
    if not QUESTIONS_PATH.exists():
        return []

    with QUESTIONS_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, list):
        raise QuestionGenerationError("questions.json must contain a top-level JSON array")

    return data


def dedupe_and_merge(existing: list[dict], generated: list[QuestionModel]) -> tuple[list[dict], int]:
    seen = {
        (
            str(item.get("role", "")).strip(),
            str(item.get("level", "")).strip(),
            str(item.get("prompt", "")).strip(),
        )
        for item in existing
    }

    merged = list(existing)
    added = 0

    for item in generated:
        key = (item.role, item.level, item.prompt)
        if key in seen:
            continue
        merged.append(item.model_dump())
        seen.add(key)
        added += 1

    return merged, added


def dedupe_generated_questions(generated: list[QuestionModel]) -> list[QuestionModel]:
    seen: set[tuple[str, str, str]] = set()
    unique_items: list[QuestionModel] = []

    for item in generated:
        key = (item.role, item.level, item.prompt)
        if key in seen:
            continue
        seen.add(key)
        unique_items.append(item)

    return unique_items


def generate_questions_with_retries(*, role: str, level: str, count: int, topic: str | None) -> list[QuestionModel]:
    collected: list[QuestionModel] = []
    last_error: QuestionGenerationError | None = None
    stalled_attempts = 0
    existing_prompts = [
        str(item.get("prompt", "")).strip()
        for item in load_existing_questions()
        if str(item.get("role", "")).strip() == role and str(item.get("level", "")).strip() == level
    ]

    max_attempts = max(MAX_GENERATION_ATTEMPTS, count * 2)

    for attempt in range(1, max_attempts + 1):
        remaining = count - len(dedupe_generated_questions(collected))
        if remaining <= 0:
            break

        banned_prompts = existing_prompts + [item.prompt for item in collected]
        prompt = build_prompt(
            role=role,
            level=level,
            count=min(remaining, 3),
            topic=topic,
            banned_prompts=banned_prompts,
        )
        raw = call_ollama(prompt)

        try:
            batch = parse_generated_questions(raw)
        except QuestionGenerationError as exc:
            last_error = QuestionGenerationError(
                f"{exc}. Raw response preview: {shorten_for_debug(raw)}"
            )
            continue

        before_count = len(collected)
        collected.extend(batch)
        collected = dedupe_generated_questions(collected)
        after_count = len(collected)

        if after_count == before_count:
            stalled_attempts += 1
        else:
            stalled_attempts = 0

        print(
            f"Attempt {attempt}/{max_attempts}: collected {len(collected)} of {count} unique questions"
        )

        if stalled_attempts >= 5:
            break

    if len(collected) < count:
        if last_error is not None and not collected:
            raise last_error
        raise QuestionGenerationError(
            f"Collected only {len(collected)} unique questions out of requested {count}. "
            f"Try rerunning the command, lowering --count, or adding --topic for narrower prompts."
        )

    return collected[:count]


def save_questions(items: list[dict]) -> None:
    QUESTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with QUESTIONS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(items, handle, indent=2)
        handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate interview questions with Ollama and append them to backend/data/questions.json."
    )
    parser.add_argument("--role", required=True, choices=sorted(VALID_ROLES))
    parser.add_argument("--level", required=True, choices=sorted(VALID_LEVELS))
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--topic", help="Optional topic to focus the generated questions on.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.count < 1 or args.count > 25:
        raise QuestionGenerationError("--count must be between 1 and 25")

    generated = generate_questions_with_retries(
        role=args.role,
        level=args.level,
        count=args.count,
        topic=args.topic,
    )

    existing = load_existing_questions()
    merged, added = dedupe_and_merge(existing, generated)
    save_questions(merged)

    print(f"Generated {len(generated)} candidate questions")
    print(f"Added {added} new questions to {QUESTIONS_PATH}")
    print("Run `python -m backend.seed_questions` to insert them into the database.")


if __name__ == "__main__":
    try:
        main()
    except QuestionGenerationError as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(1)
