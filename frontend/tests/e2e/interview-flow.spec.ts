import { expect, test } from "@playwright/test";

test("submits an answer and opens coach chat with mocked backend data", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "test-token");
  });

  await page.route("**/questions?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: 1,
            role: "SWE",
            level: "intern",
            topic: "operating_systems",
            company: "Meta",
            companies: ["Meta"],
            prompt: "Explain the difference between a process and a thread.",
            difficulty: "easy",
          },
        ],
      }),
    });
  });

  await page.route("**/history", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route("**/scoring/submit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer_id: 11,
        question_id: 1,
        role: "SWE",
        overall: 62,
        scores: {
          technical_depth: 63,
          clarity: 60,
          completeness: 58,
          structure: 67,
        },
        feedback: {
          strengths: ["You distinguished the two concepts."],
          weaknesses: ["You did not explain isolation or overhead clearly."],
          missing_keywords: ["isolation", "overhead"],
          instant_feedback: {
            summary: "Decent foundation, but the answer still needs clearer precision, stronger support, or better structure.",
            improvements: ["Mention isolation and overhead explicitly."],
            next_focus: "Specificity",
            label: "deterministic",
            source: "deterministic",
          },
          notes: {
            confidence: "high",
            degraded: false,
          },
        },
      }),
    });
  });

  await page.route("**/feedback-chat/answers/11", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: 21,
        answer_id: 11,
        ai_available: true,
        messages: [],
      }),
    });
  });

  await page.route("**/feedback-chat/answers/11/messages", async (route) => {
    const requestBody = route.request().postDataJSON() as { content: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: 21,
        answer_id: 11,
        ai_available: true,
        user_message: {
          id: 1,
          role: "user",
          content: requestBody.content,
          created_at: "2026-05-06T12:00:00Z",
        },
        assistant_message: {
          id: 2,
          role: "assistant",
          content: "Focus on isolation and overhead first.",
          created_at: "2026-05-06T12:00:01Z",
        },
      }),
    });
  });

  await page.goto("/interview?role=swe&level=intern");

  await expect(page.getByText("Explain the difference between a process and a thread.")).toBeVisible();

  await page.getByRole("textbox").first().fill(
    "A process has its own memory and isolation, while a thread shares memory inside a process.",
  );
  await page.getByRole("button", { name: "Submit Answer →" }).click();

  await expect(page.getByText("Improvement Protocol")).toBeVisible();
  await expect(page.getByText("Coach Chat")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rewrite my answer more strongly." })).toBeVisible();

  await page.getByRole("button", { name: "How should I improve this answer first?" }).click();
  await expect(page.getByText("Focus on isolation and overhead first.")).toBeVisible();
});
