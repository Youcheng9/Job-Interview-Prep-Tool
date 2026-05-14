from __future__ import annotations

import unittest
from unittest.mock import patch

from backend.tests.test_support import (
    auth_headers,
    client,
    create_question,
    reset_database,
)


class RouteTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_database()
        self.client = client()

    def test_register_login_and_protected_history_flow(self) -> None:
        register = self.client.post(
            "/auth/register",
            json={"email": "user@example.com", "password": "password123"},
        )
        self.assertEqual(register.status_code, 200)
        self.assertIn("access_token", register.json())

        login = self.client.post(
            "/auth/login",
            data={"username": "user@example.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(login.status_code, 200)

        unauthorized = self.client.get("/history")
        self.assertEqual(unauthorized.status_code, 401)

        history = self.client.get("/history", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()["items"], [])

    @patch("backend.services.auth_service.send_password_reset_email")
    def test_forgot_and_reset_password(self, send_password_reset_email) -> None:
        self.client.post(
            "/auth/register",
            json={"email": "reset@example.com", "password": "password123"},
        )

        forgot = self.client.post("/auth/forgot-password", json={"email": "reset@example.com"})
        self.assertEqual(forgot.status_code, 200)
        self.assertIn("If that account exists", forgot.json()["message"])
        send_password_reset_email.assert_called_once()
        reset_url = send_password_reset_email.call_args.kwargs["reset_url"]
        raw_token = reset_url.split("token=")[1]

        reset = self.client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": "newpassword123"},
        )
        self.assertEqual(reset.status_code, 200)

        relogin = self.client.post(
            "/auth/login",
            data={"username": "reset@example.com", "password": "newpassword123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(relogin.status_code, 200)

    @patch("backend.services.scoring_service.compute_scores")
    def test_submit_answer_and_history_round_trip(self, compute_scores) -> None:
        question_id = create_question()
        headers = auth_headers()
        compute_scores.return_value = (
            {"technical_depth": 82, "clarity": 77, "completeness": 79, "structure": 75},
            78,
            {
                "strengths": ["Good distinction between process and thread."],
                "weaknesses": ["Could be more concise."],
                "missing_concepts": ["context switch"],
                "missing_keywords": ["context switch"],
                "instant_feedback": {
                    "summary": "Strong foundation with one gap.",
                    "improvements": ["Mention context-switch overhead explicitly."],
                    "next_focus": "Specificity",
                    "label": "deterministic",
                    "source": "deterministic",
                },
                "notes": {"confidence": "high", "degraded": False},
            },
        )

        submit = self.client.post(
            "/scoring/submit",
            json={"question_id": question_id, "role": "SWE", "answer_text": "Threads share memory."},
            headers=headers,
        )
        self.assertEqual(submit.status_code, 200)
        payload = submit.json()
        self.assertEqual(payload["overall"], 78)

        history = self.client.get("/history", headers=headers)
        self.assertEqual(history.status_code, 200)
        items = history.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["overall"], 78)
        self.assertEqual(items[0]["feedback"]["instant_feedback"]["summary"], "Strong foundation with one gap.")

    def test_questions_endpoints_return_seeded_question(self) -> None:
        question_id = create_question(prompt="What is TCP?", topic="networking")
        listing = self.client.get("/questions", params={"role": "SWE", "level": "intern"})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["items"][0]["id"], question_id)

        next_question = self.client.get("/questions/next", params={"role": "SWE", "level": "intern"})
        self.assertEqual(next_question.status_code, 200)
        self.assertEqual(next_question.json()["id"], question_id)

    def test_questions_endpoints_include_items_without_topic(self) -> None:
        question_id = create_question(prompt="Explain eventual consistency.", topic=None)

        listing = self.client.get("/questions", params={"role": "SWE", "level": "intern"})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["items"][0]["id"], question_id)
        self.assertIsNone(listing.json()["items"][0]["topic"])

        next_question = self.client.get("/questions/next", params={"role": "SWE", "level": "intern"})
        self.assertEqual(next_question.status_code, 200)
        self.assertEqual(next_question.json()["id"], question_id)

    def test_reset_password_rejects_reuse_of_token(self) -> None:
        self.client.post(
            "/auth/register",
            json={"email": "reuse@example.com", "password": "password123"},
        )
        with patch("backend.services.auth_service.send_password_reset_email") as send_password_reset_email:
            self.client.post("/auth/forgot-password", json={"email": "reuse@example.com"})
            reset_url = send_password_reset_email.call_args.kwargs["reset_url"]
            raw_token = reset_url.split("token=")[1]

        first_reset = self.client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": "newpassword123"},
        )
        self.assertEqual(first_reset.status_code, 200)

        second_reset = self.client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": "anotherpassword123"},
        )
        self.assertEqual(second_reset.status_code, 400)


if __name__ == "__main__":
    unittest.main()
