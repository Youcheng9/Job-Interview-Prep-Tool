# Interview Intel — Frontend

React + TypeScript frontend for the Interview Prep Platform. AI-powered interview practice with multi-dimensional scoring and session history.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool + dev server |
| React Router v6 | Client-side routing |
| Tailwind CSS v4 | Utility styling |
| Recharts | Score visualization (radar chart) |
| localStorage | JWT token persistence |

---

## Prerequisites

- Node.js v20+
- npm v9+
- Backend running on `http://localhost:8000` (see backend README)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/interview-prep.git
cd interview-prep/frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

`.env` defaults:

```env
VITE_API_URL=http://localhost:8000
```

Only change this if your backend runs on a different port.

### 3. Start dev server

```bash
npm run dev
```

App runs at `http://localhost:5173`

> **Note:** The backend must be running and seeded before the app is usable.  
> If questions don't load, ask your backend teammate to run:
> ```bash
> python -m backend.seed_questions
> ```

---

## Available Scripts

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # TypeScript check + production build
npm run preview    # Preview production build locally
```

> There is no separate `npm run typecheck` — TypeScript errors will surface during `npm run build`. Run the build before opening a PR.

---

## Project Structure

```
src/
├── app/                      # Route-level pages
│   ├── page.tsx              # / — Role selection home
│   ├── interview/
│   │   └── page.tsx          # /interview?role=SWE
│   └── history/
│       └── page.tsx          # /history
│
├── components/
│   ├── ScoreCard.tsx         # Ring score + animated dimension bars
│   ├── FeedbackPanel.tsx     # Improvement tips + retry/next actions
│   └── RoleSelector.tsx      # 4-role card grid (SWE, DS, PM, Behavioral)
│
├── lib/
│   └── api.ts                # All fetch wrappers + shared TypeScript types
│
├── App.tsx                   # BrowserRouter + route definitions
├── main.tsx                  # React root entry point
└── index.css                 # Design tokens, global styles, animations
```

---

## Routing

| Path | Page | Auth required |
|------|------|--------------|
| `/` | Role selection | No |
| `/interview?role=SWE` | Interview session | No (but submit requires token) |
| `/history` | Session history | Yes — redirects if no token |

Valid `role` query param values: `SWE`, `DataScience`, `PM`, `Behavioral`

---

## Backend Integration

All API calls live in `src/lib/api.ts`. Do not write raw `fetch` calls in components — always go through the functions exported from `api.ts`.

### Base URL

Reads from `VITE_API_URL` env var. Defaults to `http://localhost:8000`.

### Auth

JWT token is stored in `localStorage` under the key `"token"`.

```ts
import { getToken, setToken, clearToken } from "../lib/api";

setToken(data.access_token);   // after login or register
getToken();                     // read before protected requests
clearToken();                   // on logout
```

### Key gotchas

**Login sends form data, not JSON.**  
The backend uses FastAPI's OAuth2 password form which requires `application/x-www-form-urlencoded`. The field name is `username` even though it holds an email. This is handled in `api.ts` — do not change it.

**Questions are wrapped in `{ items: [] }`.**  
The backend does not return a bare array. `getQuestions()` and `getHistory()` unwrap this automatically.

**Submit requires `role` in the request body.**  
The payload for `POST /scoring/submit` is:
```json
{
  "question_id": 2,
  "role": "SWE",
  "answer_text": "Your answer here"
}
```

### Public vs protected endpoints

| Endpoint | Auth |
|----------|------|
| `GET /health` | Public |
| `POST /auth/register` | Public |
| `POST /auth/login` | Public |
| `GET /questions?role=` | Public |
| `POST /scoring/submit` | **Protected** |
| `GET /history` | **Protected** |

---

## API Reference

### Auth

```ts
// Register — returns { access_token, token_type }
register(email: string, password: string): Promise<AuthResponse>

// Login — sends form data, returns { access_token, token_type }
login(email: string, password: string): Promise<AuthResponse>
```

### Questions

```ts
// Returns Question[] for the given role
getQuestions(role: Role): Promise<Question[]>
```

### Scoring

```ts
// Protected. Returns full ScoreResult
submitAnswer(question_id: number, role: Role, answer_text: string): Promise<ScoreResult>
```

### History

```ts
// Protected. Returns HistoryItem[] sorted newest first
getHistory(): Promise<HistoryItem[]>
```

---

## TypeScript Types

Defined and exported from `src/lib/api.ts`:

```ts
type Role = "SWE" | "DataScience" | "PM" | "Behavioral";

interface Question {
  id: number;
  role: Role;
  prompt: string;
}

interface ScoreResult {
  answer_id: number;
  question_id: number;
  role: Role;
  overall: number;
  scores: {
    technical_depth: number;
    clarity: number;
    completeness: number;
    structure: number;
  };
  feedback: {
    strengths: string[];
    weaknesses: string[];
    missing_keywords: string[];
    notes: {
      similarity_raw: number;
      keyword_coverage: number;
      ideal_snippet: string;
    };
  };
}

interface HistoryItem {
  answer_id: number;
  question_id: number;
  role: Role;
  prompt: string;
  answer_text: string;
  created_at: string;
  overall: number;
  scores: {
    technical_depth: number;
    clarity: number;
    completeness: number;
    structure: number;
  };
}
```

Import them wherever needed:

```ts
import type { Role, Question, ScoreResult, HistoryItem } from "../lib/api";
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

All Vite env vars must be prefixed with `VITE_` to be accessible in the browser.

---

## CI

GitHub Actions runs on every push or PR that touches the `frontend/` directory.

Pipeline: `npm ci` → `npm run build`

A TypeScript error or failed build will block the PR.

Workflow file: `.github/workflows/frontend.yml`

---

## Common Issues

### App loads but questions are empty
The backend database needs seeding. Tell your backend teammate:
```bash
python -m backend.seed_questions
```

### 401 on submit or history
Token is missing or expired. Check `localStorage` has a `"token"` key. Re-login to get a fresh token.

### 422 on login
The login endpoint is receiving JSON instead of form data. Do not modify the `login()` function in `api.ts` — it already handles this correctly.

### CORS error in browser
Frontend must run on `http://localhost:5173` (Vite default) or `http://localhost:3000`. Any other port will be blocked by the backend CORS config. Check your `.env` and that `npm run dev` is using the default port.

### `localStorage` token persists after browser close
This is intentional for MVP. To log out, call `clearToken()` or clear `localStorage` manually in DevTools.

---

## Branch Strategy

```
main        ← stable, deployable
dev         ← integration branch — both frontend and backend PR here
feature/*   ← your feature branches, PR into dev
```

Never push directly to `main`. Open a PR into `dev`, verify it works with the backend, then merge `dev` → `main` together.

---

## Contact

Frontend: Freeman Yiu  
Backend: Youcheng Taing