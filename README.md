# InterviewPrep

InterviewPrep is a full-stack interview practice app with:

- a React frontend
- a FastAPI backend
- PostgreSQL for storage
- JWT authentication
- embedding + rubric-based answer scoring

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

### 6. Start the backend

From the repo root:

```bash
uvicorn backend.main:app --reload --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 7. Start the frontend

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
- scoring and history are protected
- frontend stores the JWT in `localStorage`
- backend CORS currently allows `http://localhost:5173` and `http://localhost:3000`

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
