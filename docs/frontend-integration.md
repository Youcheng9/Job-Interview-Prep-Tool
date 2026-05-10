# Frontend Integration Guide — InterviewPrep Backend

This guide explains how the React frontend should connect to the FastAPI backend.

---

## Backend Base URL

Local backend URL:

```txt
http://localhost:8000
```

Swagger docs:

```txt
http://localhost:8000/docs
```

---

## CORS Setup

The backend currently allows these frontend origins:

```txt
http://localhost:3000
http://localhost:5173
```

So you can use either:

- CRA (`3000`)
- Vite (`5173`)

---

## Authentication Flow

### Important
The backend uses:

- JWT for authentication
- OAuth2 password form for login

That means:

### Register
`POST /auth/register`

Send JSON:

```json
{
  "email": "user@example.com",
  "password": "test123"
}
```

Response:

```json
{
  "access_token": "JWT_TOKEN",
  "token_type": "bearer"
}
```

---

### Login
`POST /auth/login`

This endpoint expects **form data**, not JSON.

Send:

```txt
Content-Type: application/x-www-form-urlencoded
```

Body fields:

```txt
username=user@example.com
password=test123
```

Important:
- `username` is actually the user’s email
- this is because FastAPI OAuth2 form expects the field name `username`

Response:

```json
{
  "access_token": "JWT_TOKEN",
  "token_type": "bearer"
}
```

---

## Storing the Token

After register or login:

- save `access_token`
- send it in future protected requests using:

```txt
Authorization: Bearer <access_token>
```

Example:

```txt
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Public vs Protected Endpoints

### Public
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /questions`

### Protected
- `POST /scoring/submit`
- `GET /history`

Protected endpoints require the JWT token in the `Authorization` header.

---

## Endpoints the Frontend Will Use

---

### 1. Health Check

`GET /health`

Response:

```json
{
  "status": "ok"
}
```

Use this to verify backend is running.

---

### 2. Register User

`POST /auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "test123"
}
```

Response:

```json
{
  "access_token": "JWT_TOKEN",
  "token_type": "bearer"
}
```

Suggested frontend behavior:
- automatically store token
- redirect user into the app after registration

---

### 3. Login User

`POST /auth/login`

Request type:

```txt
application/x-www-form-urlencoded
```

Body:

```txt
username=user@example.com
password=test123
```

Response:

```json
{
  "access_token": "JWT_TOKEN",
  "token_type": "bearer"
}
```

Suggested frontend behavior:
- store token
- redirect user to interview/dashboard page

---

### 4. Fetch Questions

`GET /questions?role=SWE`

Example roles:
- `SWE`
- `DataScience`
- `PM`
- `Behavioral`

Response:

```json
{
  "items": [
    {
      "id": 2,
      "role": "SWE",
      "prompt": "Explain the difference between a process and a thread."
    }
  ]
}
```

Notes:
- frontend does **not** receive rubric
- rubric stays backend-only for scoring logic

---

### 5. Submit an Answer

`POST /scoring/submit`

Protected: **Yes**

Headers:

```txt
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request body:

```json
{
  "question_id": 2,
  "role": "SWE",
  "answer_text": "A process has its own memory space, while threads share memory within a process."
}
```

Response:

```json
{
  "answer_id": 5,
  "question_id": 2,
  "role": "SWE",
  "overall": 84,
  "scores": {
    "technical_depth": 82,
    "clarity": 86,
    "completeness": 80,
    "structure": 84
  },
  "feedback": {
    "strengths": [
      "Answer semantically aligns with the ideal response."
    ],
    "weaknesses": [],
    "missing_concepts": [
      "context switch"
    ],
    "notes": {
      "similarity_raw": 0.79,
      "concept_coverage": 0.75,
      "ideal_snippet": "A process has its own address space..."
    }
  }
}
```

Suggested frontend behavior:
- display overall score
- display 4 category scores
- show strengths/weaknesses
- optionally save to local UI state for immediate history update

---

### 6. Get User History

`GET /history`

Protected: **Yes**

Headers:

```txt
Authorization: Bearer <access_token>
```

Response:

```json
{
  "items": [
    {
      "answer_id": 5,
      "question_id": 2,
      "role": "SWE",
      "prompt": "Explain the difference between a process and a thread.",
      "answer_text": "A process has its own memory space...",
      "created_at": "2026-03-14T00:00:00",
      "overall": 84,
      "scores": {
        "technical_depth": 82,
        "clarity": 86,
        "completeness": 80,
        "structure": 84
      }
    }
  ]
}
```

Suggested frontend behavior:
- show history page
- sort newest first
- show role, question prompt, answer, and score summary

---

## Example Frontend Request Patterns

### JSON request example
Used for:
- register
- submit answer

```ts
await fetch("http://localhost:8000/auth/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "user@example.com",
    password: "test123"
  })
})
```

---

### Form request example
Used for:
- login

```ts
const formData = new URLSearchParams()
formData.append("username", "user@example.com")
formData.append("password", "test123")

await fetch("http://localhost:8000/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: formData
})
```

---

### Protected request example
Used for:
- scoring
- history

```ts
await fetch("http://localhost:8000/history", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`
  }
})
```

---

## Suggested Frontend Token Strategy

For MVP:

- store token in `localStorage` or React state
- read token when making protected requests

Example:

```ts
localStorage.setItem("token", data.access_token)
```

And later:

```ts
const token = localStorage.getItem("token")
```

---

## Common Integration Issues

### 401 Unauthorized
Cause:
- token missing
- token expired
- bad Authorization header format

Fix:
- confirm header is exactly:
  ```txt
  Authorization: Bearer <token>
  ```

---

### 422 on Login
Cause:
- frontend sent JSON instead of form data

Fix:
- `/auth/login` requires:
  ```txt
  application/x-www-form-urlencoded
  ```

---

### CORS Error in Browser
Cause:
- frontend not running on allowed origin

Fix:
- run frontend on:
  - `http://localhost:3000`
  - or `http://localhost:5173`

---

### Questions Empty
Cause:
- database not seeded

Fix:
```bash
python -m backend.seed_questions
```

---

## Frontend Pages That Map to Backend Endpoints

### Login/Register Page
- `/auth/register`
- `/auth/login`

### Role Selection / Interview Page
- `/questions?role=...`

### Answer Submission / Score Page
- `/scoring/submit`

### History Page
- `/history`

---

## Recommended Frontend Integration Order

1. Health check
2. Register
3. Login
4. Fetch questions by role
5. Submit answer
6. Show score
7. Fetch history

This order makes debugging much easier.

---

## Final Notes

- The backend is already structured for frontend integration.
- Questions endpoint intentionally hides rubric.
- Login requires form data because of FastAPI OAuth2 compatibility.
- Protected routes always require JWT.

Frontend should treat the backend as the source of truth for:
- users
- questions
- answers
- scores
- history
