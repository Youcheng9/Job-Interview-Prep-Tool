const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "token";

export type Role = "swe" | "data" | "pm" | "behavioral";
export type CandidateLevel = "intern" | "new_grad";
type ApiRole = "SWE" | "DataScience" | "PM" | "Behavioral";

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Question {
  id: number;
  role: Role;
  level: CandidateLevel;
  company?: string | null;
  companies?: string[];
  text: string;
  rubric: string[];
  difficulty: "easy" | "medium" | "hard";
}

export type AIFeedbackSource = "model" | "fallback" | "pending";

export interface ScoreResult {
  answerId?: number;
  overall: number;
  technical_depth: number;
  clarity: number;
  completeness: number;
  structure: number;
  missing_concepts: string[];
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  ai_feedback_source?: AIFeedbackSource;
  ai_feedback_pending?: boolean;
  ai_feedback?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    improved_answer: string;
    next_focus: string;
    label?: string;
  };
  ai_feedback_error?: string;
  score_confidence?: "low" | "medium" | "high";
  scoring_degraded?: boolean;
}

export interface AnswerRecord {
  id: string;
  question: Question;
  answer: string;
  score: ScoreResult;
  created_at: string;
}

export interface FeedbackChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface FeedbackChatThread {
  thread_id: number;
  answer_id: number;
  ai_available: boolean;
  messages: FeedbackChatMessage[];
}

interface ApiQuestionsResponse {
  items: Array<{
    id: number;
    role: ApiRole;
    level: CandidateLevel;
    company?: string | null;
    companies?: string[];
    prompt: string;
    difficulty: Question["difficulty"];
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
    ai_feedback_source?: AIFeedbackSource;
    ai_feedback_pending?: boolean;
    ai_feedback?: {
      summary?: string;
      strengths?: string[];
      weaknesses?: string[];
      improvements?: string[];
      improved_answer?: string;
      next_focus?: string;
      label?: string;
    };
    ai_feedback_error?: string;
    notes?: {
      similarity_raw?: number;
      keyword_coverage?: number;
      ideal_snippet?: string | null;
      confidence?: "low" | "medium" | "high";
      degraded?: boolean;
    };
  };
}

interface ApiGenerateAIFeedbackResponse {
  answer_id: number;
  ai_feedback?: {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    improvements?: string[];
    improved_answer?: string;
    next_focus?: string;
    label?: string;
  } | null;
  ai_feedback_error?: string | null;
  ai_feedback_source?: AIFeedbackSource | null;
}

interface ApiHistoryResponse {
  items: Array<{
    answer_id: number;
    question_id: number;
    role: ApiRole;
    level: CandidateLevel;
      difficulty: Question["difficulty"];
      company?: string | null;
      companies?: string[];
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
    feedback?: ApiSubmitAnswerResponse["feedback"];
  }>;
}

interface ApiFeedbackChatThreadResponse {
  thread_id: number;
  answer_id: number;
  ai_available: boolean;
  messages: FeedbackChatMessage[];
}

interface ApiCreateFeedbackChatMessageResponse {
  thread_id: number;
  answer_id: number;
  ai_available: boolean;
  user_message: FeedbackChatMessage;
  assistant_message: FeedbackChatMessage;
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

function getDifficulty(level: CandidateLevel, index: number): Question["difficulty"] {
  if (level === "intern") {
    return index % 3 === 2 ? "medium" : "easy";
  }

  return index % 3 === 0 ? "medium" : "hard";
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
    answerId: payload.answer_id,
    overall: payload.overall,
    technical_depth: payload.scores.technical_depth ?? payload.overall,
    clarity: payload.scores.clarity ?? payload.overall,
    completeness: payload.scores.completeness ?? payload.overall,
    structure: payload.scores.structure ?? payload.overall,
    missing_concepts: payload.feedback?.missing_keywords ?? [],
    strengths: payload.feedback?.strengths ?? [],
    weaknesses: payload.feedback?.weaknesses ?? [],
    feedback: formatFeedback(payload.feedback),
    ai_feedback_source: payload.feedback?.ai_feedback_source,
    ai_feedback_pending: payload.feedback?.ai_feedback_pending,
    ai_feedback: payload.feedback?.ai_feedback?.summary
      ? {
          summary: payload.feedback.ai_feedback.summary,
          strengths: payload.feedback.ai_feedback.strengths ?? [],
          weaknesses: payload.feedback.ai_feedback.weaknesses ?? [],
          improvements: payload.feedback.ai_feedback.improvements ?? [],
          improved_answer: payload.feedback.ai_feedback.improved_answer ?? "",
          next_focus: payload.feedback.ai_feedback.next_focus ?? "",
          label: payload.feedback.ai_feedback.label,
        }
      : undefined,
    ai_feedback_error: payload.feedback?.ai_feedback_error,
    score_confidence: payload.feedback?.notes?.confidence,
    scoring_degraded: payload.feedback?.notes?.degraded,
  };
}

function normalizeAiFeedback(
  payload?: ApiGenerateAIFeedbackResponse["ai_feedback"],
): ScoreResult["ai_feedback"] | undefined {
  if (!payload?.summary) return undefined;

  return {
    summary: payload.summary,
    strengths: payload.strengths ?? [],
    weaknesses: payload.weaknesses ?? [],
    improvements: payload.improvements ?? [],
    improved_answer: payload.improved_answer ?? "",
    next_focus: payload.next_focus ?? "",
    label: payload.label,
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

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function getQuestions(role: Role, level: CandidateLevel): Promise<Question[]> {
  const params = new URLSearchParams({
    role: toApiRole(role),
    level,
  });
  const data = await request<ApiQuestionsResponse>(`/questions?${params.toString()}`);

  return data.items.map((item, index) => ({
    id: item.id,
    role: fromApiRole(item.role),
    level: item.level,
    company: item.company,
    companies: item.companies ?? (item.company ? [item.company] : []),
    text: item.prompt,
    rubric: [],
    difficulty: item.difficulty ?? getDifficulty(item.level, index),
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
  return data.items.map((item) => {
    const role = fromApiRole(item.role);

    return {
      id: String(item.answer_id),
      question: {
        id: item.question_id,
        role,
        level: item.level,
        company: item.company,
        companies: item.companies ?? (item.company ? [item.company] : []),
        text: item.prompt,
        rubric: [],
        difficulty: item.difficulty,
      },
      answer: item.answer_text,
      created_at: item.created_at,
      score: {
        overall: item.overall,
        technical_depth: item.scores.technical_depth ?? item.overall,
        clarity: item.scores.clarity ?? item.overall,
        completeness: item.scores.completeness ?? item.overall,
        structure: item.scores.structure ?? item.overall,
        missing_concepts: item.feedback?.missing_keywords ?? [],
        strengths: item.feedback?.strengths ?? [],
        weaknesses: item.feedback?.weaknesses ?? [],
        feedback: formatFeedback(item.feedback),
        ai_feedback_source: item.feedback?.ai_feedback_source,
        ai_feedback_pending: item.feedback?.ai_feedback_pending,
        ai_feedback: item.feedback?.ai_feedback?.summary
          ? {
              summary: item.feedback.ai_feedback.summary,
              strengths: item.feedback.ai_feedback.strengths ?? [],
              weaknesses: item.feedback.ai_feedback.weaknesses ?? [],
              improvements: item.feedback.ai_feedback.improvements ?? [],
              improved_answer: item.feedback.ai_feedback.improved_answer ?? "",
              next_focus: item.feedback.ai_feedback.next_focus ?? "",
              label: item.feedback.ai_feedback.label,
            }
          : undefined,
        ai_feedback_error: item.feedback?.ai_feedback_error,
        score_confidence: item.feedback?.notes?.confidence,
        scoring_degraded: item.feedback?.notes?.degraded,
      },
    };
  });
}

export async function generateAIFeedback(answerId: number): Promise<{
  ai_feedback?: ScoreResult["ai_feedback"];
  ai_feedback_error?: string;
  ai_feedback_source?: AIFeedbackSource;
}> {
  const data = await request<ApiGenerateAIFeedbackResponse>(`/scoring/${answerId}/ai-feedback`, {
    method: "POST",
  });

  return {
    ai_feedback: normalizeAiFeedback(data.ai_feedback),
    ai_feedback_error: data.ai_feedback_error ?? undefined,
    ai_feedback_source: data.ai_feedback_source ?? undefined,
  };
}

export async function getFeedbackChatThread(answerId: number): Promise<FeedbackChatThread> {
  return request<ApiFeedbackChatThreadResponse>(`/feedback-chat/answers/${answerId}`);
}

export async function sendFeedbackChatMessage(
  answerId: number,
  content: string,
): Promise<ApiCreateFeedbackChatMessageResponse> {
  return request<ApiCreateFeedbackChatMessageResponse>(`/feedback-chat/answers/${answerId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
