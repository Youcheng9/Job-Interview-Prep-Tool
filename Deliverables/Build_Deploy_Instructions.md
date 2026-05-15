# InterviewAce Build & Deployment Instructions

## Project
**InterviewAce — AI-Powered Interview Practice Platform**

## Current Deployment Status
InterviewAce is currently intended to run in a **local development environment**. The project is structured for future deployment, with the frontend most likely deployed through **Vercel** and the backend/database/AI services deployed separately.

This guide documents how to build and run the project locally now, and how the team should prepare the project for future production deployment.

---

## 1. System Overview

InterviewAce is a full-stack interview preparation platform with the following major parts:

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| ORM / Migrations | SQLAlchemy, Alembic |
| AI Scoring | sentence-transformers, all-MiniLM-L6-v2 |
| AI Coach | Ollama, llama3.2 |
| Email Service | Brevo SMTP |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Future Frontend Hosting | Vercel |

The application flow is:

1. User opens the React frontend.
2. Frontend calls the FastAPI backend.
3. Backend handles authentication, question retrieval, scoring, feedback, AI coach interaction, and history retrieval.
4. PostgreSQL stores users, questions, answers, scores, feedback/history, and reset-token data.
5. sentence-transformers performs deterministic scoring.
6. Ollama provides optional AI Coach responses.
7. Brevo SMTP supports password reset email delivery.

---

## 2. Repository Structure

The repository is expected to follow a structure similar to:

```text
Job-Interview-Prep-Tool/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── data/
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── Deliverables/
├── docker-compose.yml
├── README.md
└── RELEASE_NOTES.md
```

Folder names may differ slightly depending on the current repository organization. Always check the latest `README.md` and `.env.example` files before running the app.

---

## 3. Prerequisites

Before building or running InterviewAce locally, install the following:

| Tool | Purpose |
|---|---|
| Node.js | Runs the React/Vite frontend |
| npm | Installs frontend dependencies |
| Python 3.11+ | Runs the FastAPI backend |
| PostgreSQL | Local database |
| Docker Desktop | Optional containerized local development |
| Git | Clone and manage repository |
| Ollama | Runs local AI coach model |
| GitHub account | Source control and CI |
| Vercel account | Future frontend deployment |

Recommended versions:

```text
Node.js: 18+
Python: 3.11+
PostgreSQL: 14+
Docker Desktop: latest stable
Ollama: latest stable
```

---

## 4. Clone the Repository

```bash
git clone https://github.com/Youcheng9/Job-Interview-Prep-Tool.git
cd Job-Interview-Prep-Tool
```

If working from the main branch:

```bash
git checkout main
```

---

## 5. Environment Variables

InterviewAce uses environment variables for database access, authentication secrets, email configuration, AI service configuration, and frontend API URLs.

Create environment files from the provided examples.

### Backend Environment

Create:

```bash
backend/.env
```

Example backend values:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/interviewprep
JWT_SECRET=replace_with_secure_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

PASSWORD_RESET_URL_BASE=http://localhost:3000/auth?mode=reset

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=replace_with_smtp_user
SMTP_PASSWORD=replace_with_smtp_password
EMAIL_FROM=no-reply@interviewprep.local

OLLAMA_URL=http://localhost:11434/api/generate
AI_COACH_CHAT_MODEL=llama3.2:3b
```

### Frontend Environment

Create:

```bash
frontend/.env
```

Example frontend values:

```env
VITE_API_URL=http://localhost:8000
```

For Vite apps, client-exposed environment variables should use the `VITE_` prefix. This is also important for future Vercel deployment.

---

## 6. Local Backend Setup

### Step 1 — Create and Activate Python Environment

```bash
cd backend
python -m venv .venv
```

Activate the environment:

#### macOS / Linux

```bash
source .venv/bin/activate
```

#### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### Step 2 — Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Start PostgreSQL

If PostgreSQL is installed locally, make sure the service is running and create the database:

```bash
createdb interviewprep
```

If using Docker for PostgreSQL:

```bash
docker compose up -d db
```

The service name may differ depending on the final `docker-compose.yml`.

### Step 4 — Run Database Migrations

```bash
alembic upgrade head
```

### Step 5 — Generate Questions (Optional)

If you want to expand or refresh the question bank before seeding the database, generate questions first.

Example:

```bash
python -m backend.generate_questions --role SWE --level new_grad --count 10
```

You can also target a topic when needed:

```bash
python -m backend.generate_questions --role DataScience --level intern --count 5 --topic "sql and data cleaning"
```

This step updates the question source data used by the seed script. If you only want to load the existing committed question set, you can skip this step.

### Step 6 — Seed Questions

After the question source data is ready, seed the questions into PostgreSQL:

```bash
python -m backend.seed_questions
```

If the actual module path differs, use the command documented in the backend README or seed script header.

Recommended order:

1. Run `alembic upgrade head`
2. Run `python -m backend.generate_questions ...` if you want new or refreshed questions
3. Run `python -m backend.seed_questions`

### Step 7 — Run FastAPI Backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

If the FastAPI app module differs, use the app path from the repository.

Expected local backend URL:

```text
http://localhost:8000
```

API docs are typically available at:

```text
http://localhost:8000/docs
```

---

## 7. Local Frontend Setup

Open a new terminal.

```bash
cd frontend
npm install
npm run dev
```

Expected local frontend URL:

```text
http://localhost:3000
```

The frontend should call the backend using:

```text
VITE_API_URL=http://localhost:8000
```

---

## 8. Ollama Setup for AI Coach

InterviewAce uses Ollama for local AI Coach responses.

### Step 1 — Install Ollama

Install Ollama from the official Ollama distribution for your operating system.

### Step 2 — Pull the Model

```bash
ollama pull llama3.2
```

### Step 3 — Start Ollama

```bash
ollama serve
```

Expected Ollama URL:

```text
http://localhost:11434
```

If Ollama is unavailable, the backend should still allow scoring to complete and return deterministic rubric feedback. AI Coach responses may be absent or disabled until Ollama is running.

---

## 9. Docker-Based Local Development

The repository includes a root-level `docker-compose.yml` for containerized local development.

The default Docker workflow is intentionally lightweight:

- `frontend`, `backend`, and `db` start by default
- `ollama` is optional and should only be started when AI Coach behavior needs to be tested

This keeps first-time setup faster and avoids forcing every teammate to download large Ollama images and models before they can test the main application flow.

### Standard Docker Startup

Start the default local stack with:

```bash
docker compose up --build
```

Expected default services:

| Service | Purpose |
|---|---|
| frontend | React/Vite UI |
| backend | FastAPI API |
| db | PostgreSQL |

Expected local URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
```

Notes:

- PostgreSQL runs inside the Docker network and does not need to be exposed to the host for normal app usage.
- The backend can still complete deterministic scoring even when Ollama is not running.
- This should be the default command for onboarding, UI verification, API testing, and most QA checks.

### AI-Enabled Docker Startup

If you want to test AI Coach behavior with Ollama in Docker, start the optional AI profile:

```bash
export OLLAMA_URL=http://ollama:11434/api/generate
docker compose --profile ai up --build
```

This adds:

| Service | Purpose |
|---|---|
| ollama | Optional AI coach runtime |

After the Ollama container starts, pull the required models:

```bash
docker compose exec ollama ollama pull llama3.2:3b
docker compose exec ollama ollama pull llama3.1:8b
```

### Host Ollama Alternative

If Ollama is already running on the host machine, you can keep using the standard Docker startup:

```bash
ollama serve
docker compose up --build
```

In that mode, the backend can call the host Ollama instance instead of starting the Ollama container.

### Stopping the Stack

Stop containers:

```bash
docker compose down
```

Remove containers and volumes:

```bash
docker compose down -v
```

Use `-v` carefully because it removes database and model-cache volumes.

---

## 10. Local Verification Checklist

### Frontend Checks

- Home page loads successfully.
- User can register or log in.
- Role selector displays SWE, Data Science / ML, PM, and Behavioral.
- Level selector displays Intern and New Grad.
- Practice page loads questions.
- Answer input accepts text.
- Empty or whitespace-only answers are blocked.
- Score view displays Technical Depth, Clarity, Completeness, and Structure.
- AI Coach panel opens and messages wrap correctly.
- History page displays previous submissions.
- Mobile layout has no horizontal overflow.

### Backend Checks

- `POST /auth/register` works.
- `POST /auth/login` returns a JWT.
- Protected endpoints reject missing or invalid JWTs.
- `GET /questions` returns seeded questions.
- `POST /scoring/submit` returns score and feedback.
- `GET /history` returns user-specific submissions.
- Password reset flow sends or mocks email correctly.
- PostgreSQL stores answers and scores.

### AI / ML Checks

- sentence-transformers scoring runs successfully.
- Repeated same-answer submissions produce deterministic numeric scores.
- Ollama coach response works when Ollama is running.
- Scoring still works if Ollama is unavailable.

---

## 11. Running Tests

### Backend Tests

From the backend directory:

```bash
pytest
```

Recommended backend test groups:

```bash
pytest tests/test_auth.py
pytest tests/test_questions.py
pytest tests/test_scoring.py
pytest tests/test_history.py
pytest tests/test_persistence.py
```

### Frontend Tests

From the frontend directory:

```bash
npm test
```

If using Vitest:

```bash
npm run test
```

If using Playwright:

```bash
npx playwright test
```

### Build Checks

Frontend build:

```bash
npm run build
```

Backend start/import check:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

---

## 12. GitHub Actions CI

The repository includes GitHub Actions workflows for automated validation.

Recommended CI checks:

- Frontend install
- Frontend build
- Frontend tests
- Backend dependency install
- Backend pytest
- Lint checks
- Docker build check
- Smoke test for critical routes

CI should use mocked or controlled versions of external services:

| External Service | CI Recommendation |
|---|---|
| Brevo SMTP | Mock email send |
| Ollama | Mock response or run optional integration job |
| PostgreSQL | Use disposable test database container |

---

## 13. Current Deployment Status

The project is currently in **local development mode**.

Production deployment is not finalized yet.

Current recommended deployment direction:

| Component | Current Plan |
|---|---|
| Frontend | Future deployment to Vercel |
| Backend | Separate API hosting service or container platform |
| PostgreSQL | Managed PostgreSQL provider |
| Ollama | Local/self-hosted model service or backend-adjacent service |
| Brevo SMTP | External email provider |
| CI/CD | GitHub Actions |

---

## 14. Future Vercel Frontend Deployment Plan

The frontend is a Vite React app, so Vercel is a good fit for hosting the frontend as a static/client application.

### Recommended Vercel Setup

1. Push the repository to GitHub.
2. Log in to Vercel.
3. Import the GitHub repository.
4. Set the Vercel project root directory to the frontend folder.
5. Confirm framework preset as Vite.
6. Set the build command.
7. Set the output directory.
8. Add environment variables.
9. Deploy the frontend project.

### Suggested Vercel Settings

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Vercel supports configuring a project root directory for monorepos, which is important because this repository contains more than only the frontend. Vercel also supports Vite projects and custom build settings.

### Frontend Environment Variables on Vercel

Add this in Vercel project settings:

```env
VITE_API_URL=https://your-backend-api-domain.com
```

Do not use this for client-side Vite code:

```env
API_BASE_URL=...
```

Vite only exposes frontend environment variables that use the `VITE_` prefix.

---

## 15. Future Backend Deployment Plan

The FastAPI backend should be deployed separately from Vercel unless the project is intentionally restructured for serverless functions.

Recommended backend hosting options:

- Render
- Railway
- Fly.io
- DigitalOcean App Platform
- AWS ECS / EC2
- Google Cloud Run
- Azure Container Apps

Backend deployment must support:

- Python runtime
- Long-running FastAPI service
- PostgreSQL connection
- sentence-transformers dependency
- access to Ollama or fallback configuration
- environment variables
- database migrations

### Backend Deployment Checklist

Before deploying backend:

- Confirm `DATABASE_URL` points to production PostgreSQL.
- Confirm `JWT_SECRET` is secure and not committed.
- Confirm CORS allows the deployed Vercel frontend domain.
- Run Alembic migrations.
- Seed production/demo questions.
- Confirm `/auth/login`, `/questions`, `/scoring/submit`, and `/history` work.
- Confirm Ollama fallback behavior works if Ollama is not available.
- Confirm password reset URL points to deployed frontend.

---

## 16. Future Database Deployment Plan

For production/demo deployment, use a managed PostgreSQL provider.

Recommended options:

- Supabase PostgreSQL
- Neon
- Railway PostgreSQL
- Render PostgreSQL
- AWS RDS

Database deployment steps:

1. Create managed PostgreSQL instance.
2. Copy production connection string.
3. Set backend `DATABASE_URL`.
4. Run migrations:

```bash
alembic upgrade head
```

5. Seed role/level questions.
6. Verify user registration and answer persistence.

---

## 17. Future Production Environment Variables

### Backend Production Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=secure_production_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

PASSWORD_RESET_URL_BASE=https://your-vercel-frontend-domain.com/auth?mode=reset

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
EMAIL_FROM=...

OLLAMA_URL=https://your-ollama-service-or-internal-host/api/generate
AI_COACH_CHAT_MODEL=llama3.2:3b
```

### Frontend Production Variables

```env
VITE_API_URL=https://your-backend-api-domain.com
```

---

## 18. CORS Configuration

When deploying the frontend to Vercel and backend separately, the backend must allow requests from the frontend domain.

Example allowed origins:

```text
http://localhost:3000
https://your-vercel-project.vercel.app
https://your-custom-domain.com
```

Do not leave CORS fully open in production unless this is only a demo environment.

---

## 19. Deployment Validation Checklist

### Authentication

- User registration works.
- User login returns JWT.
- Protected pages redirect unauthenticated users.
- Password reset email flow works or is safely mocked.

### Questions

- Role filters work.
- Level filters work.
- Topic/difficulty filtering works if enabled.
- Seeded questions are available.

### Scoring

- Answer submission works.
- Whitespace-only answers are rejected.
- Four-axis score is returned.
- Feedback appears.
- Deterministic scoring remains stable.

### AI Coach

- AI Coach panel opens.
- Messages send correctly.
- Long messages wrap correctly.
- Ollama fallback does not break scoring.

### History

- Submitted answers appear in history.
- History timestamps are correct.
- Users only see their own records.

### Responsive UI

- 375 px mobile viewport works.
- 768 px tablet viewport works.
- Desktop layout works.
- No horizontal overflow appears.

---

## 20. Troubleshooting

### Frontend Cannot Reach Backend

Check:

```env
VITE_API_URL
```

Confirm backend is running and CORS allows the frontend origin.

### Backend Cannot Connect to Database

Check:

```env
DATABASE_URL
```

Then verify PostgreSQL is running and migrations have been applied.

### Questions Are Missing

Check whether the database was seeded after the latest question data update.

If you generated new questions, seed them into PostgreSQL:

```bash
python -m backend.seed_questions
```

If you want to create additional questions before seeding, run:

```bash
python -m backend.generate_questions --role SWE --level new_grad --count 10
python -m backend.seed_questions
```

If the repository uses a different module path, use the command documented in the backend README.

### Score Submission Fails

Check:

- backend logs
- question exists
- rubric fields exist
- answer text is valid
- sentence-transformers dependencies installed
- database connection is healthy

### AI Coach Does Not Respond

Check:

```bash
ollama serve
ollama list
```

Confirm the model exists:

```bash
ollama pull llama3.2
```

If Ollama is unavailable, scoring should still succeed.

### Password Reset Link Is Wrong

Check:

```env
PASSWORD_RESET_URL_BASE
```

For local development:

```env
PASSWORD_RESET_URL_BASE=http://localhost:3000/auth?mode=reset
```

For production:

```env
PASSWORD_RESET_URL_BASE=https://your-vercel-frontend-domain.com/auth?mode=reset
```

---

## 21. Recommended Future Deployment Architecture

Recommended production/demo setup:

```text
User Browser
   |
   | HTTPS
   v
Vercel Frontend
   |
   | HTTPS API calls
   v
FastAPI Backend Hosting
   |
   | SQLAlchemy
   v
Managed PostgreSQL

FastAPI Backend
   |-- Brevo SMTP for password reset
   |-- sentence-transformers for scoring
   |-- Ollama service for AI Coach
```

This keeps the frontend simple to deploy on Vercel while allowing the backend to run in an environment better suited for FastAPI, ML dependencies, PostgreSQL access, and Ollama integration.

---

## 22. Final Notes

InterviewAce is currently best treated as a local development and academic demonstration project. The project is structured well for future deployment, but the backend, database, and AI services should be deployed carefully because they have different runtime needs than the frontend.

For the next production-ready milestone, the team should prioritize:

1. Finalizing backend hosting.
2. Configuring managed PostgreSQL.
3. Updating CORS and production environment variables.
4. Deploying the Vite frontend to Vercel.
5. Running the full QA smoke checklist after deployment.
6. Updating this document with final production URLs.

---

## 23. Repository

GitHub Repository:

```text
https://github.com/Youcheng9/Job-Interview-Prep-Tool
```
