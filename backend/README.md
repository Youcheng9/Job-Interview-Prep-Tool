# Backend Documentation — InterviewPrep

## Overview

The backend is a FastAPI service that supports:

- User authentication (register/login) with JWT  
- Question retrieval from PostgreSQL  
- Answer submission + automatic scoring  
- Ollama-based coach chat for submitted answers
- User history (past answers + scores)  
- Database schema migrations via Alembic  

This backend is designed to be the **source of truth** for users, questions, answers, and scores.

---

## Tech Stack

- **Framework:** FastAPI  
- **Database:** PostgreSQL  
- **ORM:** SQLAlchemy  
- **Migrations:** Alembic  
- **Auth:** JWT (HS256) + bcrypt password hashing  
- **Scoring:** sentence-transformers embeddings + cosine similarity + keyword coverage  
- **AI coach chat:** Ollama local LLM coaching layer  

---

## Folder Structure

```
backend/
├── main.py                  # FastAPI app entrypoint, router registration
├── routers/
│   ├── auth.py              # /auth/register, /auth/login
│   ├── questions.py         # /questions endpoints
│   ├── scoring.py           # /scoring/submit endpoint
│   └── history.py           # /history endpoint
├── models/
│   ├── db.py                # SQLAlchemy engine/session + get_db dependency
│   └── models.py            # ORM models: User, Question, Answer, Score
├── schemas/
│   ├── auth.py              # Pydantic request/response types for auth
│   ├── scoring.py           # Pydantic request/response types for scoring
│   └── history.py           # Pydantic request/response types for history
├── ml/
│   └── scorer.py            # compute_scores(): semantic similarity + concept coverage scoring logic
├── migrations/              # Alembic migration scripts
├── data/
│   └── questions.json       # Seed data for initial questions + rubric
├── feedback_agent.py        # Ollama-based AI coaching feedback
├── seed_questions.py        # Seeds questions.json into DB
└── dependencies.py          # get_current_user() JWT -> User dependency
```

---

## Environment Variables

Create `backend/.env` locally (do not commit):

```env
# Database
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/interviewprep

# JWT
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Ollama coach chat
OLLAMA_URL=http://127.0.0.1:11434/api/generate
AI_COACH_CHAT_MODEL=llama3.2:3b
AI_COACH_CHAT_ENABLED=true
AI_COACH_TIMEOUT_SECONDS=30
AI_COACH_CHAT_MAX_TOKENS=180
AI_COACH_PROMPT_IDEAL_CHARS=220
AI_CHAT_NUM_CTX=768
AI_CHAT_PROMPT_ANSWER_CHARS=420
AI_CHAT_PROMPT_HISTORY_CHARS=180

# Optional question generation overrides
QUESTION_GENERATION_MODEL=llama3.1:8b
QUESTION_GENERATION_TIMEOUT_SECONDS=90
QUESTION_GENERATION_MAX_TOKENS=1800
QUESTION_GENERATION_MAX_ATTEMPTS=8
QUESTION_GENERATION_DUPLICATE_OVERLAP=0.8
```

### Notes

- **JWT_SECRET** must be kept private.  
- If `JWT_SECRET` changes, all existing tokens become invalid (users must log in again).  
- Keep a committed `backend/.env.example` with placeholder values.

---

## How to Run Locally

### 1. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 2. Run DB migrations

```bash
alembic upgrade head
```

### 3. Seed questions

```bash
python -m backend.seed_questions
```

### 4. Start the API

```bash
uvicorn backend.main:app --reload --port 8000
```

### 5. Start Ollama for coach chat

```bash
ollama serve
```

If needed for coach chat:

```bash
ollama pull llama3.2:3b
```

If you plan to regenerate the question bank with the default question-generation model:

```bash
ollama pull llama3.1:8b
```

### 6. Open docs

- Swagger UI: http://localhost:8000/docs

---

## Database Schema

### Tables

### `users`

Stores registered users.

- id (PK)  
- email (unique)  
- password_hash (bcrypt hash string)  
- created_at  

### `questions`

Interview questions available for practice.

- id (PK)  
- role (e.g., SWE, DataScience, PM, Behavioral)  
- prompt (question text)  
- rubric (JSON) — scoring criteria per question  

### `answers`

A user’s submitted answer to a question.

- id (PK)  
- user_id (FK → users.id)  
- question_id (FK → questions.id)  
- answer_text  
- created_at  

### `scores`

Score + feedback for an answer (1:1 with answers).

- id (PK)  
- answer_id (FK → answers.id, unique)  
- scores (JSON) — dimension scores  
- overall (int)  
- feedback (JSON)  
- created_at  

### Relationships

- User 1 → many Answers  
- Question 1 → many Answers  
- Answer 1 → 1 Score  

---

## Question Rubric Format (Important)

Each question’s rubric is stored as JSON and drives scoring.

Example `backend/data/questions.json` entry:

```json
{
  "role": "SWE",
  "prompt": "Explain the difference between a process and a thread.",
  "rubric": {
    "ideal_answer": "A process has its own address space and resources; threads share memory within a process and are lighter weight.",
    "concepts": ["address space", "shared memory", "context switch", "lightweight"],
    "dimension_concepts": {
      "technical_depth": ["address space", "context switch"],
      "clarity": ["difference", "example"],
      "completeness": ["address space", "shared memory", "context switch"],
      "structure": ["first", "second", "in contrast", "for example"]
    }
  }
}
```

### Minimum required keys

- `ideal_answer` (string)  
- `concepts` (list of strings)  

### Optional

- `dimension_concepts` (dict of lists)  

---

## Authentication Flow (JWT)

### Register

- `POST /auth/register`  
- Accepts JSON body:

```json
{
  "email": "user@example.com",
  "password": "test123"
}
```

- Stores user with bcrypt hashed password  
- Returns JWT token  

### Login

- `POST /auth/login`  
- Uses OAuth2 password flow form data (Swagger-compatible)  
  - `username` field is treated as email  
  - `password` field is password  
- Returns JWT token  

### Using the token

Protected endpoints require:

```
Authorization: Bearer <access_token>
```

### How user identity is determined

`backend/dependencies.py` defines `get_current_user()`:

- Decodes JWT using `JWT_SECRET`  
- Reads `sub` claim (email)  
- Queries DB to find that user  
- Returns User object to the route  

---

## Scoring System (ML + Heuristics)

Scoring occurs in `backend/ml/scorer.py` via:

```
compute_scores(answer_text, rubric)
```

### Signals used

#### 1. Semantic similarity

- Embeds `answer_text` and `rubric["ideal_answer"]` using sentence-transformers  
- Computes cosine similarity  
- Mapped into a 0–1 range  

#### 2. Concept coverage

- Measures semantic coverage of `rubric["concepts"]`
- Exact wording is not required; paraphrases can still receive credit

### Outputs

## AI Feedback Layer

Numeric scoring remains deterministic, but written coaching feedback is generated with a local Ollama model.

Current flow:

1. `compute_scores()` creates numeric scores and concept-gap feedback.
2. `backend/feedback_agent.py` sends the question, answer, rubric, and score breakdown to Ollama.
3. Ollama returns structured coaching feedback:
   - summary
   - strengths
   - weaknesses
   - improvements
   - improved answer
   - next focus
4. The backend stores this inside the `feedback` JSON for the score record.

If Ollama is unavailable, scoring still works and the request does not fail. Only the AI coaching section is skipped.

- `scores_dict` (dimension scores 0–100):
  - technical_depth  
  - clarity  
  - completeness  
  - structure  
- `overall_int` (0–100)  
- `feedback` dict:
  - strengths  
  - weaknesses  
  - missing_concepts  
  - notes (similarity & concept coverage)

---

## API Endpoints Summary

### `GET /questions`

Query params:

- role (optional)

Returns:

- list of questions with id, role, prompt, rubric

---

### `POST /scoring/submit` (Protected)

Request JSON:

```json
{
  "question_id": 1,
  "role": "SWE",
  "answer_text": "..."
}
```

Behavior:

- Stores Answer for current user  
- Computes Score from rubric  
- Stores Score  
- Returns score + feedback  

---

### `GET /history` (Protected)

Returns:

- user’s recent answers + scores + prompts  

---

## Migrations (Alembic)

Create migration:

```bash
alembic revision --autogenerate -m "message"
```

Apply migrations:

```bash
alembic upgrade head
```

Check current version:

```bash
alembic current
```

---

## Common Troubleshooting

### 401 Unauthorized

- You are not logged in / token missing  
- In Swagger: click **Authorize** and login  
- Ensure `Authorization: Bearer <token>` is set  

### 500 on scoring

- sentence-transformers may download model on first run  
- Confirm dependencies installed  
- Check server logs for traceback  
- Confirm rubric contains `ideal_answer` and `concepts`  

### Seed questions not showing

```sql
SELECT COUNT(*) FROM questions;
```

If zero:

```bash
python -m backend.seed_questions
```
