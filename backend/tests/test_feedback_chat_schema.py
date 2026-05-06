from __future__ import annotations

import unittest

from pydantic import ValidationError

from backend.schemas.feedback_chat import CreateFeedbackChatMessageRequest


class FeedbackChatSchemaTests(unittest.TestCase):
    def test_rejects_whitespace_only_content(self):
        with self.assertRaises(ValidationError):
            CreateFeedbackChatMessageRequest(content="   \n\t  ")

    def test_accepts_non_blank_content(self):
        payload = CreateFeedbackChatMessageRequest(content=" Rewrite this answer ")
        self.assertEqual(payload.content, " Rewrite this answer ")


if __name__ == "__main__":
    unittest.main()
