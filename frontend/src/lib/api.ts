const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "token";

export type Role = "swe" | "data" | "pm" | "behavioral";
type ApiRole = "SWE" | "DataScience" | "PM" | "Behavioral";

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Question {
  id: number;
  role: Role;
  text: string;
  rubric: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface ScoreResult {
  overall: number;
  technical_depth: number;
  clarity: number;
  completeness: number;
  structure: number;
  missing_concepts: string[];
  strengths: string[];
  feedback: string;
}

export interface AnswerRecord {
  id: string;
  question: Question;
  answer: string;
  score: ScoreResult;
  created_at: string;
}

interface ApiQuestionsResponse {
  items: Array<{
    id: number;
    role: ApiRole;
    prompt: string;
  }>;
}

interface ApiSubmitAnswerResponse {
  answer_id: number;
  question_id: number;
  role: ApiRole;
  overall: number;
  scores: {
    technical_depth?: number;
    clarity?: number;
    completeness?: number;
    structure?: number;
  };
  feedback?: {
    strengths?: string[];
    weaknesses?: string[];
    missing_keywords?: string[];
    notes?: {
      similarity_raw?: number;
      keyword_coverage?: number;
      ideal_snippet?: string | null;
    };
  };
}

interface ApiHistoryResponse {
  items: Array<{
    answer_id: number;
    question_id: number;
    role: ApiRole;
    prompt: string;
    answer_text: string;
    created_at: string;
    overall: number;
    scores: {
      technical_depth?: number;
      clarity?: number;
      completeness?: number;
      structure?: number;
    };
  }>;
}

function toApiRole(role: Role): ApiRole {
  switch (role) {
    case "swe":
      return "SWE";
    case "data":
      return "DataScience";
    case "pm":
      return "PM";
    case "behavioral":
      return "Behavioral";
  }
}

function fromApiRole(role: string): Role {
  switch (role) {
    case "SWE":
      return "swe";
    case "DataScience":
      return "data";
    case "PM":
      return "pm";
    case "Behavioral":
      return "behavioral";
    default:
      return "swe";
  }
}

function getDifficulty(index: number): Question["difficulty"] {
  const levels: Question["difficulty"][] = ["easy", "medium", "hard"];
  return levels[index % levels.length];
}

function formatFeedback(payload?: ApiSubmitAnswerResponse["feedback"]): string {
  if (!payload) return "";

  const parts = [
    ...(payload.weaknesses ?? []),
    ...(payload.strengths ?? []).length && !(payload.weaknesses ?? []).length
      ? payload.strengths ?? []
      : [],
  ].filter(Boolean);

  return parts.join(" ");
}

function normalizeScore(payload: ApiSubmitAnswerResponse): ScoreResult {
  return {
    overall: payload.overall,
    technical_depth: payload.scores.technical_depth ?? payload.overall,
    clarity: payload.scores.clarity ?? payload.overall,
    completeness: payload.scores.completeness ?? payload.overall,
    structure: payload.scores.structure ?? payload.overall,
    missing_concepts: payload.feedback?.missing_keywords ?? [],
    strengths: payload.feedback?.strengths ?? [],
    feedback: formatFeedback(payload.feedback),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    let message = err || `HTTP ${res.status}`;

    try {
      const parsed = JSON.parse(err) as { detail?: string };
      if (parsed.detail) {
        message = parsed.detail;
      }
    } catch {
      // Keep the raw text when the backend does not return JSON.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  setToken(data.access_token);
  return data;
}

export async function getQuestions(role: Role): Promise<Question[]> {
  const data = await request<ApiQuestionsResponse>(`/questions?role=${toApiRole(role)}`);

  return data.items.map((item, index) => ({
    id: item.id,
    role: fromApiRole(item.role),
    text: item.prompt,
    rubric: [],
    difficulty: getDifficulty(index),
  }));
}

export async function submitAnswer(
  questionId: number | string,
  answer: string,
  role?: Role,
): Promise<ScoreResult> {
  let resolvedRole = role;

  if (!resolvedRole) {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get("role");
    if (queryRole === "swe" || queryRole === "data" || queryRole === "pm" || queryRole === "behavioral") {
      resolvedRole = queryRole;
    }
  }

  if (!resolvedRole) {
    throw new Error("Role is required to submit an answer.");
  }

  const data = await request<ApiSubmitAnswerResponse>("/scoring/submit", {
    method: "POST",
    body: JSON.stringify({
      question_id: Number(questionId),
      role: toApiRole(resolvedRole),
      answer_text: answer,
    }),
  });

  return normalizeScore(data);
}

export async function getHistory(): Promise<AnswerRecord[]> {
  const data = await request<ApiHistoryResponse>("/history");

  return data.items.map((item, index) => ({
    id: String(item.answer_id),
    question: {
      id: item.question_id,
      role: fromApiRole(item.role),
      text: item.prompt,
      rubric: [],
      difficulty: getDifficulty(index),
    },
    answer: item.answer_text,
    created_at: item.created_at,
    score: {
      overall: item.overall,
      technical_depth: item.scores.technical_depth ?? item.overall,
      clarity: item.scores.clarity ?? item.overall,
      completeness: item.scores.completeness ?? item.overall,
      structure: item.scores.structure ?? item.overall,
      missing_concepts: [],
      strengths: [],
      feedback: "",
    },
  }));
}
