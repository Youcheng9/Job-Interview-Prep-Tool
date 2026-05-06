from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.tests.test_support import auth_headers, client, create_question, reset_database, session_scope
from backend.feedback_agent import FeedbackAgentError
from backend.services.feedback_chat_service import FeedbackChatService
from backend.models.models import Answer, FeedbackThread, Question, Score, User


class FeedbackChatServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_database()
        self.client = client()
        self.headers = auth_headers(email="chat@example.com")
        self.question_id = create_question()
        self.answer_id = self._create_answer_record()

    def _create_answer_record(self) -> int:
        with session_scope() as db:
            user = db.query(User).filter(User.email == "chat@example.com").first()
            question = db.query(Question).filter(Question.id == self.question_id).first()
            answer = Answer(user_id=user.id, question_id=question.id, answer_text="Threads share memory in a process.")
            db.add(answer)
            db.flush()
            score = Score(
                answer_id=answer.id,
                scores={"technical_depth": 70, "clarity": 68, "completeness": 65, "structure": 60},
                overall=66,
                feedback={
                    "strengths": ["You identified the main distinction."],
                    "weaknesses": ["Mention isolation and overhead more directly."],
                    "missing_keywords": ["isolation", "overhead"],
                    "instant_feedback": {
                        "summary": "Good start, but still needs work.",
                        "improvements": ["Mention isolation and overhead."],
                        "next_focus": "Specificity",
                        "label": "deterministic",
                        "source": "deterministic",
                    },
                },
            )
            db.add(score)
            db.flush()
            return int(answer.id)

    def test_thread_created_on_first_fetch(self) -> None:
        thread_response = self.client.get(f"/feedback-chat/answers/{self.answer_id}", headers=self.headers)
        self.assertEqual(thread_response.status_code, 200)
        payload = thread_response.json()
        self.assertEqual(payload["answer_id"], self.answer_id)
        self.assertEqual(payload["messages"], [])

        with session_scope() as db:
            thread = db.query(FeedbackThread).filter(FeedbackThread.answer_id == self.answer_id).first()
            self.assertIsNotNone(thread)

    @patch("backend.services.feedback_chat_service.feedback_enabled", return_value=False)
    def test_disabled_ai_uses_fallback_reply(self, _feedback_enabled) -> None:
        response = self.client.post(
            f"/feedback-chat/answers/{self.answer_id}/messages",
            json={"content": "Rewrite my answer more strongly."},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("A stronger version should lead with the direct answer", payload["assistant_message"]["content"])

    @patch("backend.services.feedback_chat_service.generate_feedback_chat_reply", side_effect=FeedbackAgentError("timed out"))
    @patch("backend.services.feedback_chat_service.feedback_enabled", return_value=True)
    def test_timeout_falls_back_to_deterministic_chat_reply(self, _feedback_enabled, _generate_reply) -> None:
        response = self.client.post(
            f"/feedback-chat/answers/{self.answer_id}/messages",
            json={"content": "Why does this still need work?"},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("main issue the scorer found", response.json()["assistant_message"]["content"])

    @patch("backend.services.feedback_chat_service.generate_feedback_chat_reply", return_value="Coach response")
    @patch("backend.services.feedback_chat_service.feedback_enabled", return_value=True)
    def test_existing_history_is_passed_to_chat_model(self, _feedback_enabled, generate_feedback_chat_reply) -> None:
        first = self.client.post(
            f"/feedback-chat/answers/{self.answer_id}/messages",
            json={"content": "Rewrite my answer more strongly."},
            headers=self.headers,
        )
        self.assertEqual(first.status_code, 200)

        second = self.client.post(
            f"/feedback-chat/answers/{self.answer_id}/messages",
            json={"content": "How should I improve this answer first?"},
            headers=self.headers,
        )
        self.assertEqual(second.status_code, 200)
        history = generate_feedback_chat_reply.call_args.kwargs["history"]
        self.assertGreaterEqual(len(history), 2)
        self.assertEqual(history[-1]["content"], "How should I improve this answer first?")


if __name__ == "__main__":
    unittest.main()
