from __future__ import annotations

import unittest

from backend.feedback_agent import build_fallback_chat_reply


class FeedbackAgentFallbackTests(unittest.TestCase):
    def test_rewrite_prompt_returns_rewrite_guidance(self) -> None:
        reply = build_fallback_chat_reply(
            user_message="Rewrite my answer more strongly.",
            feedback={"missing_concepts": ["isolation", "overhead"]},
        )
        self.assertIn("explicitly mention isolation, overhead", reply)

    def test_why_prompt_explains_main_issue(self) -> None:
        reply = build_fallback_chat_reply(
            user_message="Why does this still need work?",
            feedback={"weaknesses": ["Mention isolation and overhead more directly."]},
        )
        self.assertIn("main issue the scorer found", reply)

    def test_no_specific_match_uses_next_focus(self) -> None:
        reply = build_fallback_chat_reply(
            user_message="What should I focus on next?",
            feedback={"instant_feedback": {"next_focus": "Specificity"}},
        )
        self.assertIn("Specificity", reply)


if __name__ == "__main__":
    unittest.main()
