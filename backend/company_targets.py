from __future__ import annotations

CANONICAL_TARGET_COMPANIES: tuple[str, ...] = (
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
)

ROLE_COMPANY_TAGS: dict[str, tuple[str, ...]] = {
    "SWE": CANONICAL_TARGET_COMPANIES,
    "DataScience": CANONICAL_TARGET_COMPANIES,
    "PM": CANONICAL_TARGET_COMPANIES,
    "Behavioral": CANONICAL_TARGET_COMPANIES,
}
