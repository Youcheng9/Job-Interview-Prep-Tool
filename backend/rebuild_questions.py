from __future__ import annotations

import argparse

from backend.generate_questions import (
    QuestionGenerationError,
    dedupe_generated_questions,
    generate_questions_with_retries,
    normalize_company,
    save_questions,
)

DEFAULT_COMPANIES = [
    "OpenAI",
    "Google",
    "Meta",
    "Stripe",
    "NVIDIA",
    "Databricks",
    "Airbnb",
    "Netflix",
    "Figma",
    "Notion",
    "Anthropic",
    "Scale AI",
]
DEFAULT_ROLES = ["SWE", "DataScience", "PM", "Behavioral"]
DEFAULT_LEVELS = ["intern", "new_grad"]
DEFAULT_DIFFICULTIES = ["easy", "medium", "hard"]
DEFAULT_TOPICS = {
    "SWE": (
        "data structures, algorithms, debugging, backend APIs, databases, "
        "concurrency, testing, performance, system design; exclude machine learning, "
        "neural networks, statistics, experiments, feature engineering, and data science"
    ),
    "DataScience": (
        "SQL, statistics, experimentation, data cleaning, feature engineering, model evaluation, "
        "machine learning tradeoffs, and analytical reasoning"
    ),
    "PM": (
        "product sense, prioritization, metrics, execution, stakeholder communication, "
        "roadmap tradeoffs, and strategy"
    ),
    "Behavioral": (
        "leadership, ownership, ambiguity, conflict resolution, teamwork, communication, "
        "learning from failure, and impact"
    ),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rewrite backend/data/questions.json from the current role/level/difficulty/company config."
    )
    parser.add_argument("--roles", nargs="+", default=DEFAULT_ROLES, choices=DEFAULT_ROLES)
    parser.add_argument("--levels", nargs="+", default=DEFAULT_LEVELS, choices=DEFAULT_LEVELS)
    parser.add_argument("--difficulties", nargs="+", default=DEFAULT_DIFFICULTIES, choices=DEFAULT_DIFFICULTIES)
    parser.add_argument(
        "--companies",
        nargs="+",
        default=DEFAULT_COMPANIES,
        help="Company list to target. Defaults to the companies shown in the frontend.",
    )
    parser.add_argument(
        "--count-per-company",
        type=int,
        default=1,
        help="Questions to generate for each company/role/level/difficulty combination. Default: 1",
    )
    parser.add_argument(
        "--topic-suffix",
        help="Optional extra topic guidance appended to the role-specific topic template.",
    )
    return parser.parse_args()


def normalize_companies(companies: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for company in companies:
        cleaned = normalize_company(company)
        if not cleaned:
            continue
        lowered = cleaned.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(cleaned)
    return normalized


def topic_for_role(role: str, topic_suffix: str | None) -> str:
    base = DEFAULT_TOPICS[role]
    if not topic_suffix:
        return base
    return f"{base}; {topic_suffix.strip()}"


def main() -> None:
    args = parse_args()
    if args.count_per_company < 1 or args.count_per_company > 5:
        raise QuestionGenerationError("--count-per-company must be between 1 and 5")

    companies = normalize_companies(args.companies)
    rebuilt: list = []

    total_jobs = len(args.roles) * len(args.levels) * len(args.difficulties) * len(companies)
    completed_jobs = 0

    for role in args.roles:
        topic = topic_for_role(role, args.topic_suffix)
        for level in args.levels:
            for difficulty in args.difficulties:
                for company in companies:
                    completed_jobs += 1
                    print(
                        f"[{completed_jobs}/{total_jobs}] role={role} level={level} "
                        f"difficulty={difficulty} company={company}"
                    )
                    generated = generate_questions_with_retries(
                        difficulty=difficulty,
                        role=role,
                        level=level,
                        count=args.count_per_company,
                        companies=[company],
                        topic=topic,
                    )
                    rebuilt.extend(generated)
                    rebuilt = dedupe_generated_questions(rebuilt)

    save_questions([item.model_dump() for item in rebuilt])
    print(f"Rebuilt {len(rebuilt)} questions into backend/data/questions.json")
    print("Run `python -m backend.seed_questions` to add any new questions into PostgreSQL.")


if __name__ == "__main__":
    try:
        main()
    except QuestionGenerationError as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(1)
