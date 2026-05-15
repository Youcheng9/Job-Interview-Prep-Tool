**Every Deliverable Document is located in the `Deliverables` directory**
Team Members:
- Youcheng Taing (Youcheng9)
- Freeman Yiu (Coolguy4123)
  
# InterviewPrep

InterviewPrep is a full-stack interview practice app with:

- a React frontend
- a FastAPI backend
- PostgreSQL for storage
- JWT authentication
- embedding + rubric-based answer scoring
- Ollama-based AI coaching feedback

## Repo Layout

```txt
SWE-Interview-AI/
├── frontend/
├── backend/
├── docs/
└── README.md
```

## What Works

- user registration and login
- forgot-password and reset-password flow
- question retrieval by role
- protected answer scoring
- protected history view
- frontend redirects to auth when protected actions need a token

## Prerequisites

Install these before running the project:

- Python 3.11+ recommended
- Node.js 20+
- npm 9+
- PostgreSQL
- Ollama

## Full Project Setup

### 1. Clone and enter the repo

```bash
git clone <your-repo-url>
cd SWE-Interview-AI
```

### 2. Set up the backend environment

Create a virtual environment if you want:

```bash
python -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` so it points to your local PostgreSQL database and has a real JWT secret.

Expected variables:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/interviewprep
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
PASSWORD_RESET_URL_BASE=http://localhost:5173/auth?mode=reset

EMAIL_FROM=no-reply@interviewprep.local
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_TLS=true

OLLAMA_URL=http://127.0.0.1:11434/api/generate
AI_COACH_CHAT_MODEL=llama3.2:3b
AI_COACH_CHAT_ENABLED=true
AI_COACH_TIMEOUT_SECONDS=30
AI_COACH_CHAT_MAX_TOKENS=180
AI_COACH_PROMPT_IDEAL_CHARS=220
AI_CHAT_NUM_CTX=768
AI_CHAT_PROMPT_ANSWER_CHARS=420
AI_CHAT_PROMPT_HISTORY_CHARS=180

QUESTION_GENERATION_MODEL=llama3.1:8b
QUESTION_GENERATION_TIMEOUT_SECONDS=90
QUESTION_GENERATION_MAX_TOKENS=1800
QUESTION_GENERATION_MAX_ATTEMPTS=8
QUESTION_GENERATION_DUPLICATE_OVERLAP=0.8
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Create the PostgreSQL database

Example:

```sql
CREATE DATABASE interviewprep;
```

### 4. Run migrations

From the repo root:

```bash
alembic upgrade head
```

### 5. Seed the questions

From the repo root:

```bash
python -m backend.seed_questions
```

### 5b. Generate new questions with Ollama

If you want AI to draft more questions into `backend/data/questions.json`, first make sure Ollama is running, then use:

```bash
python -m backend.generate_questions --role SWE --level new_grad --count 10
```

Optional topic targeting:

```bash
python -m backend.generate_questions --role DataScience --level intern --count 5 --topic "sql and data cleaning"
```

Then seed the generated questions into PostgreSQL:

```bash
python -m backend.seed_questions
```

### 6. Start the backend

From the repo root:

```bash
uvicorn backend.main:app --reload --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 7. Start Ollama

In another terminal:

```bash
ollama serve
```

If the model is not installed yet:

```bash
ollama pull llama3.1:8b
```

### 8. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- App: `http://localhost:5173`

## Quick Start Summary

If your database is already created and `backend/.env` is configured, the usual local workflow is:

Terminal 1:

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Then open:

```txt
http://localhost:5173
```

## How To Use The App

1. Open the frontend home page.
2. Choose a role.
3. If you want scoring/history, sign in or register from `/auth`.
4. Start an interview session.
5. Submit an answer to receive a score.
6. Open `/history` to review prior submissions.

## Integration Notes

- frontend questions are public
- questions are currently loaded from the hardcoded seeded JSON dataset
- scoring and history are protected
- frontend stores the JWT in `localStorage`
- backend CORS currently allows `http://localhost:5173` and `http://localhost:3000`
- backend CORS can be configured with `CORS_ALLOW_ORIGINS`
- Ollama is used for AI coaching feedback on submitted answers

## Troubleshooting

### Frontend loads but no questions appear

Check:

- backend is running
- migrations were applied
- questions were seeded

### Login works but scoring fails

Check:

- backend `JWT_SECRET` is set
- token is present in `localStorage`
- the user is still valid in the database

### History redirects back to auth

Usually the token is missing, expired, or invalid. Sign in again.

### Browser shows a CORS error

Run the frontend on:

- `http://localhost:5173`
- or `http://localhost:3000`

### Backend scoring crashes on first use

The scoring pipeline uses `sentence-transformers`, so the first run may need model setup and can be slower than later requests.

## More Docs

- frontend docs: `frontend/README.md`
- backend docs: `backend/README.md`
- frontend/backend contract: `docs/frontend-integration.md`
