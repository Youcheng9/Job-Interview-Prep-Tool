# Interview Intel Frontend

React + TypeScript frontend for the InterviewPrep platform.

This app lets users:

- choose an interview track
- practice questions by role
- register or sign in
- submit answers for backend scoring
- view saved session history

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS v4

## Routes

| Path | Purpose | Auth |
|---|---|---|
| `/` | Home and role selection | No |
| `/auth` | Login / registration | No |
| `/interview?role=swe` | Interview session | Questions are public, scoring requires auth |
| `/history` | Session history | Yes |

Frontend role query params are:

- `swe`
- `data`
- `pm`
- `behavioral`

The API layer maps those values to the backend role values automatically.

## Project Structure

```txt
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── auth/page.tsx
│   │   ├── interview/page.tsx
│   │   └── history/page.tsx
│   ├── components/
│   ├── lib/api.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
└── README.md
```

## API Integration

All backend communication goes through `src/lib/api.ts`.

Do not add raw `fetch()` calls directly in page components unless there is a strong reason to extend the API layer first.

### Base URL

The frontend reads the backend URL from:

```env
VITE_API_URL=http://localhost:8000
```

If `VITE_API_URL` is missing, it defaults to `http://localhost:8000`.

### Token Storage

JWTs are stored in `localStorage` under the key `token`.

Available helpers:

- `setToken(token)`
- `getToken()`
- `clearToken()`
- `isAuthenticated()`

### Backend Contract

The frontend is wired to this backend behavior:

- `POST /auth/register`
  - JSON body: `{ "email": "...", "password": "..." }`
- `POST /auth/login`
  - `application/x-www-form-urlencoded`
  - fields: `username`, `password`
- `GET /questions?role=SWE`
  - returns `{ items: [...] }`
- `POST /scoring/submit`
  - requires `Authorization: Bearer <token>`
  - JSON body:

```json
{
  "question_id": 1,
  "role": "SWE",
  "answer_text": "..."
}
```

- `GET /history`
  - requires `Authorization: Bearer <token>`
  - returns `{ items: [...] }`

### Current Normalization

The frontend keeps some UI-friendly types that differ from the raw backend payloads.

Examples:

- question `prompt` is normalized to frontend `text`
- backend role values like `DataScience` are normalized to frontend `data`
- history items are reshaped into the existing UI model

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+
- backend API running on `http://localhost:8000`

### Install

```bash
cd frontend
npm install
```

### Configure

Create `frontend/.env` if you want to override the default backend URL:

```env
VITE_API_URL=http://localhost:8000
```

### Start

```bash
npm run dev
```

Vite runs on:

```txt
http://localhost:5173
```

This matters because the backend CORS config currently allows:

- `http://localhost:5173`
- `http://localhost:3000`

## Build

```bash
npm run build
```

This runs the TypeScript build and the Vite production build.

## User Flow

### Public flow

1. Open `/`
2. Choose a role
3. Open `/interview?role=...`
4. Load questions from the backend

### Authenticated flow

1. Open `/auth`
2. Register or sign in
3. Submit an answer from the interview page
4. Receive a scored result from the backend
5. Open `/history` to review prior submissions

### Redirect behavior

- if a user tries to score without a token, the frontend redirects to `/auth`
- if a user opens `/history` without a token, the frontend redirects to `/auth`
- if the backend rejects an expired or invalid token, the frontend clears it and sends the user back to `/auth`

## Known Limitations

These are backend-contract limitations, not frontend bugs:

- `/questions` does not currently return `difficulty`
- `/questions` does not expose rubric hints to the frontend
- `/history` does not currently return detailed feedback text

The frontend fills those gaps with placeholders where needed so the UI can still render.

## Common Issues

### Questions do not load

Usually one of these is true:

- backend is not running
- database migrations were not applied
- questions were not seeded

### Submit or history returns 401

Usually one of these is true:

- user is not logged in
- token expired
- backend JWT secret changed

Use the auth page to sign in again.

### Login returns 422

The login endpoint expects form data, not JSON. The frontend API client already handles this. Do not change login to send JSON.

### CORS error in the browser

Run the frontend on `5173` or `3000`. Other ports are not allowed by the backend CORS config right now.

### Build warning about CSS `@import`

There is an existing CSS warning in `src/index.css` about `@import` ordering. The app still builds successfully.
