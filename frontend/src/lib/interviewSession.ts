import type { CandidateLevel, Role } from "./api";

const SESSION_KEY_PREFIX = "interview-session";
const LAST_SESSION_KEY = `${SESSION_KEY_PREFIX}:last`;
const ROLES: Role[] = ["swe", "data", "pm", "behavioral"];
const LEVELS: CandidateLevel[] = ["intern", "new_grad"];

interface SavedInterviewSession {
  role: Role;
  level: CandidateLevel;
  questionId: number;
  href: string;
}

function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

function isLevel(value: string): value is CandidateLevel {
  return LEVELS.includes(value as CandidateLevel);
}

function buildHref(role: Role, level: CandidateLevel, questionId: number) {
  return `/interview?role=${role}&level=${level}&questionId=${questionId}`;
}

export function getSessionKey(role: Role, level: CandidateLevel) {
  return `${SESSION_KEY_PREFIX}:${role}:${level}`;
}

function getSessionOrderKey(role: Role, level: CandidateLevel) {
  return `${getSessionKey(role, level)}:order`;
}

export function readSavedQuestionId(role: Role, level: CandidateLevel): number | null {
  const saved = localStorage.getItem(getSessionKey(role, level));
  if (!saved) return null;

  const parsed = Number(saved);
  return Number.isFinite(parsed) ? parsed : null;
}

export function saveInterviewSession(role: Role, level: CandidateLevel, questionId: number) {
  localStorage.setItem(getSessionKey(role, level), String(questionId));
  localStorage.setItem(LAST_SESSION_KEY, `${role}:${level}:${questionId}`);
}

export function readSavedQuestionOrder(role: Role, level: CandidateLevel): number[] | null {
  const saved = localStorage.getItem(getSessionOrderKey(role, level));
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return null;
    const values = parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    return values.length ? values : null;
  } catch {
    return null;
  }
}

export function saveQuestionOrder(role: Role, level: CandidateLevel, questionIds: number[]) {
  localStorage.setItem(getSessionOrderKey(role, level), JSON.stringify(questionIds));
}

export function clearInterviewSession(role: Role, level: CandidateLevel) {
  localStorage.removeItem(getSessionKey(role, level));
  localStorage.removeItem(getSessionOrderKey(role, level));
}

export function getSavedInterviewSession(): SavedInterviewSession | null {
  const last = localStorage.getItem(LAST_SESSION_KEY);

  if (last) {
    const [role, level, questionIdValue] = last.split(":");
    const questionId = Number(questionIdValue);

    if (role && level && isRole(role) && isLevel(level) && Number.isFinite(questionId)) {
      return {
        role,
        level,
        questionId,
        href: buildHref(role, level, questionId),
      };
    }
  }

  for (const role of ROLES) {
    for (const level of LEVELS) {
      const questionId = readSavedQuestionId(role, level);
      if (questionId !== null) {
        return {
          role,
          level,
          questionId,
          href: buildHref(role, level, questionId),
        };
      }
    }
  }

  return null;
}
