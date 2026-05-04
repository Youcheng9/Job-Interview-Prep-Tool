from __future__ import annotations


def get_question_difficulty(level: str, index: int) -> str:
    if level == "intern":
        return "medium" if index % 3 == 2 else "easy"
    return "medium" if index % 3 == 0 else "hard"
