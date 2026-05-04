import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ScoreCard } from "../../components/ScoreCard";
import { FeedbackPanel } from "../../components/FeedbackPanel";
import { readSavedQuestionId, saveInterviewSession } from "../../lib/interviewSession";
import {
  type CandidateLevel,
  clearToken,
  generateAIFeedback,
  getHistory,
  getQuestions,
  isAuthenticated,
  submitAnswer,
  type Role,
  type Question,
  type ScoreResult,
} from "../../lib/api";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: null | (() => void);
  onend: null | (() => void);
  onerror: null | ((event: { error?: string }) => void);
  onresult: null | ((event: SpeechRecognitionResultEventLike) => void);
};

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0: {
      transcript: string;
    };
  }>;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

// Typing animation for question text
function TypedText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed("");
    idx.current = 0;
    const iv = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(iv);
      }
    }, 18);
    return () => clearInterval(iv);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "1em",
            background: "var(--cyan)",
            verticalAlign: "text-bottom",
            animation: "flicker 1s infinite",
          }}
        />
      )}
    </span>
  );
}

// Difficulty badge
function DiffBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    easy: "#22c55e",
    medium: "#f59e0b",
    hard: "#ef4444",
  };
  const c = colors[level] ?? "var(--muted)";
  return (
    <span
      className="mono"
      style={{
        fontSize: "12px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c,
        border: `1px solid ${c}40`,
        background: `${c}12`,
        padding: "4px 10px",
      }}
    >
      {level}
    </span>
  );
}

function LevelBadge({ level }: { level: CandidateLevel }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: "12px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--cyan)",
        border: "1px solid var(--cyan-dim)",
        background: "rgba(13,148,136,0.12)",
        padding: "4px 10px",
      }}
    >
      {level === "intern" ? "Intern" : "New Grad"}
    </span>
  );
}

type Phase = "question" | "submitting" | "result";
const ROLE_LABELS: Record<Role, string> = {
  swe: "SWE",
  data: "DSA",
  pm: "PM",
  behavioral: "Behavioral",
};

export default function InterviewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roleParam = params.get("role");
  const role = roleParam === "data" || roleParam === "pm" || roleParam === "behavioral" ? roleParam : "swe";
  const levelParam = params.get("level");
  const level: CandidateLevel = levelParam === "intern" ? "intern" : "new_grad";
  const requestedQuestionId = Number(params.get("questionId"));

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("question");
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [authed, setAuthed] = useState(isAuthenticated());
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isGeneratingAiFeedback, setIsGeneratingAiFeedback] = useState(false);
  const [isQuestionSidebarPinned, setIsQuestionSidebarPinned] = useState(false);
  const [isQuestionSidebarPreviewed, setIsQuestionSidebarPreviewed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  useEffect(() => {
    if (authed) return;

    const next = `${location.pathname}${location.search}`;
    navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
  }, [authed, location.pathname, location.search, navigate]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(Recognition));

    if (!Recognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setSpeechError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      const nextError =
        event.error === "not-allowed"
          ? "Microphone access was blocked. Please allow mic access and try again."
          : event.error === "no-speech"
            ? "No speech was detected. Try again and speak a bit closer to the mic."
            : "Speech recognition could not capture audio clearly.";
      setSpeechError(nextError);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript ?? "";
        if (event.results[index]?.isFinal) {
          finalTranscript += transcript;
        }
      }

      if (!finalTranscript.trim()) return;

      setAnswer((current) => {
        const separator = current.trim().length ? " " : "";
        const nextValue = `${current}${separator}${finalTranscript.trim()}`.replace(/\s+/g, " ").trim();
        setCharCount(nextValue.length);
        return nextValue;
      });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!authed) return;

    setError(null);
    getQuestions(role, level)
      .then((loadedQuestions) => {
        setQuestions(loadedQuestions);
        if (!loadedQuestions.length) {
          setError(`No ${level === "intern" ? "intern" : "new grad"} questions are available for this track yet.`);
          return;
        }

        const requestedIndex = Number.isFinite(requestedQuestionId)
          ? loadedQuestions.findIndex((item) => item.id === requestedQuestionId)
          : -1;
        const savedQuestionId = readSavedQuestionId(role, level);
        const savedIndex =
          savedQuestionId === null ? -1 : loadedQuestions.findIndex((item) => item.id === savedQuestionId);
        const nextIndex = requestedIndex >= 0 ? requestedIndex : savedIndex >= 0 ? savedIndex : 0;

        setQIndex(nextIndex);
        setAnswer("");
        setCharCount(0);
        setScore(null);
        setIsGeneratingAiFeedback(false);
        setPhase("question");
      })
      .catch(() => setError("Failed to load questions."));
  }, [authed, level, role, requestedQuestionId]);

  useEffect(() => {
    if (!authed) {
      setCompletedIds([]);
      return;
    }

    getHistory()
      .then((records) => {
        const answeredForRole = records
          .filter((record) => record.question.role === role && record.question.level === level)
          .map((record) => record.question.id);
        setCompletedIds(Array.from(new Set(answeredForRole)));
      })
      .catch(() => {
        setCompletedIds([]);
      });
  }, [authed, level, role]);

  const question = questions[qIndex];
  const progress = questions.length ? ((qIndex + 1) / questions.length) * 100 : 0;
  const isQuestionSidebarVisible = isQuestionSidebarPinned || isQuestionSidebarPreviewed;

  useEffect(() => {
    if (!question) return;

    saveInterviewSession(role, level, question.id);
    navigate(`/interview?role=${role}&level=${level}&questionId=${question.id}`, { replace: true });
  }, [level, navigate, question, role]);

  async function handleSubmit() {
    if (!question || answer.trim().length < 20) return;
    if (!authed) {
      navigate(`/auth?next=${encodeURIComponent(`/interview?role=${role}&level=${level}`)}`);
      return;
    }
    setPhase("submitting");
    setIsGeneratingAiFeedback(false);
    setError(null);
    try {
      const result = await submitAnswer(question.id, answer, role);
      setScore(result);
      setCompletedIds((current) => (current.includes(question.id) ? current : [...current, question.id]));
      setPhase("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scoring failed. Please retry.";
      const normalizedMessage = message.toLowerCase();
      if (
        normalizedMessage.includes("not authenticated") ||
        normalizedMessage.includes("could not validate credentials")
      ) {
        clearToken();
        setAuthed(false);
        navigate(`/auth?next=${encodeURIComponent(`/interview?role=${role}&level=${level}`)}`);
        return;
      }
      setError(message);
      setPhase("question");
    }
  }

  async function handleGenerateAiFeedback() {
    if (!score?.answerId || isGeneratingAiFeedback) return;

    setIsGeneratingAiFeedback(true);
    setError(null);

    try {
      const result = await generateAIFeedback(score.answerId);
      setScore((current) => {
        if (!current) return current;

        return {
          ...current,
          ai_feedback: result.ai_feedback,
          ai_feedback_error: result.ai_feedback_error,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI feedback failed. Please retry.";
      setScore((current) => {
        if (!current) return current;

        return {
          ...current,
          ai_feedback_error: message,
        };
      });
    } finally {
      setIsGeneratingAiFeedback(false);
    }
  }

  function selectQuestion(index: number) {
    setQIndex(index);
    setAnswer("");
    setCharCount(0);
    setScore(null);
    setIsGeneratingAiFeedback(false);
    setPhase("question");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function selectSidebarQuestion(nextQuestion: Question) {
    const nextIndex = questions.findIndex((item) => item.id === nextQuestion.id);
    if (nextIndex >= 0) {
      selectQuestion(nextIndex);
    }
  }

  function handleNext() {
    if (qIndex + 1 < questions.length) {
      selectQuestion(qIndex + 1);
    } else {
      navigate("/history");
    }
  }

  function handleRetry() {
    setAnswer("");
    setScore(null);
    setIsGeneratingAiFeedback(false);
    setPhase("question");
  }

  function handleSpeechToggle() {
    if (!recognitionRef.current) {
      setSpeechError("Speech-to-text is not supported in this browser.");
      return;
    }

    setSpeechError(null);

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    textareaRef.current?.focus();
    recognitionRef.current.start();
  }

  if (!authed) {
    return null;
  }

  // Loading state
  if (!questions.length && !error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          className="mono"
          style={{ color: "var(--cyan)", letterSpacing: "0.15em", fontSize: "14px" }}
        >
          LOADING {level === "intern" ? "INTERN" : "NEW GRAD"} QUESTION BANK...
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--cyan)",
                animation: `flicker 1.2s ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`interview-page ${isQuestionSidebarVisible ? "interview-page-sidebar-visible" : ""}`}
      style={{
        position: "relative",
      }}
    >
      <div
        className={`question-sidebar-drawer ${isQuestionSidebarPinned ? "question-sidebar-drawer-pinned" : ""}`}
        onMouseEnter={() => setIsQuestionSidebarPreviewed(true)}
        onMouseLeave={() => setIsQuestionSidebarPreviewed(false)}
      >
        <button
          type="button"
          className="question-sidebar-rail"
          onClick={() => setIsQuestionSidebarPinned((current) => !current)}
          aria-expanded={isQuestionSidebarPinned}
          aria-controls="question-bank-sidebar"
          title={isQuestionSidebarPinned ? "Unpin question bank" : "Pin question bank"}
        >
          <span>{isQuestionSidebarPinned ? "Hide Questions" : "Questions"}</span>
        </button>

        <aside id="question-bank-sidebar" className="question-sidebar question-sidebar-panel panel" aria-label="Question sidebar">
          <div className="question-sidebar-header">
            <div>
              <div className="mono question-sidebar-kicker">Question Bank</div>
              <div className="question-sidebar-title">
                {ROLE_LABELS[role]} · {level === "intern" ? "Intern" : "New Grad"}
              </div>
            </div>
            <div className="mono question-sidebar-count">
              {completedIds.length} done
            </div>
          </div>

          <div className="question-sidebar-progress mono">
            Question {questions.length ? qIndex + 1 : 0} of {questions.length}
          </div>

          <div className="question-sidebar-items">
            {questions.length ? (
              questions.map((item, index) => {
                const active = question?.id === item.id;
                const completed = completedIds.includes(item.id);
                const questionNumber = index + 1;
                const locked = !authed && index >= 3;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`question-sidebar-item ${active ? "question-sidebar-item-active" : ""} ${locked ? "question-sidebar-item-locked" : ""}`}
                    onClick={() => {
                      if (!locked) {
                        selectSidebarQuestion(item);
                      }
                    }}
                    disabled={locked}
                    title={locked ? "Sign in to unlock more questions" : item.text}
                  >
                    <span className="mono question-sidebar-number">Q{questionNumber}</span>
                    <span className="question-sidebar-text">{item.text}</span>
                    <span className={`question-sidebar-difficulty question-sidebar-difficulty-${item.difficulty}`}>
                      {item.difficulty}
                    </span>
                    {completed ? <span className="question-sidebar-done">Done</span> : null}
                  </button>
                );
              })
            ) : (
              <div className="question-sidebar-empty">No matching questions.</div>
            )}
            {!authed && questions.length > 3 ? (
              <div className="question-sidebar-signin">
                <div>Sign in to unlock the full question bank</div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate(`/auth?next=${encodeURIComponent(`/interview?role=${role}&level=${level}`)}`)}
                >
                  Sign in for more questions
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="interview-layout">

        <main className="interview-main">
        <div className="interview-progress-track" aria-hidden="true">
          <div
            className="interview-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid #ef444440",
              borderLeft: "2px solid #ef4444",
              padding: "14px 18px",
              fontSize: "15px",
              color: "#ef4444",
              marginBottom: "20px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ERROR: {error}
          </div>
        )}

        {!authed && (
          <div
            className="panel animate-fade-up"
            style={{
              marginBottom: "20px",
              padding: "22px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
            }}
          >
            <div>
              <div
                className="mono"
                style={{
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  color: "var(--amber)",
                  marginBottom: "6px",
                }}
              >
                SCORE LOCKED
              </div>
              <div style={{ color: "var(--muted)", fontSize: "16px", lineHeight: 1.7 }}>
                Questions are public, but scoring and session history require a signed-in account.
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate(`/auth?next=${encodeURIComponent(`/interview?role=${role}&level=${level}`)}`)}
              style={{ fontSize: "15px", flexShrink: 0 }}
            >
              Sign In
            </button>
          </div>
        )}

        {question && (
          <>
            {/* Question panel */}
            <div
              className="panel animate-fade-up"
              style={{ padding: "34px", marginBottom: "28px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: "13px",
                    color: "var(--cyan)",
                    letterSpacing: "0.15em",
                  }}
                >
                  Q_{String(qIndex + 1).padStart(3, "0")}
                </span>
                <LevelBadge level={level} />
                <DiffBadge level={question.difficulty} />
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              <p
                style={{
                  fontSize: "24px",
                  fontFamily: "var(--font-head)",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  lineHeight: 1.7,
                  color: "var(--text)",
                  minHeight: "90px",
                }}
              >
                {phase === "question" || phase === "submitting" ? (
                  <TypedText text={question.text} />
                ) : (
                  question.text
                )}
              </p>

              {/* Rubric hints (collapsed) */}
              {question.rubric?.length > 0 && (
                <details style={{ marginTop: "16px" }}>
                  <summary
                    style={{
                      fontFamily: "var(--font-head)",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    View Rubric Hints
                  </summary>
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {question.rubric.map((r) => (
                      <span
                        key={r}
                        className="mono"
                        style={{
                          fontSize: "13px",
                          color: "var(--muted)",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          padding: "5px 12px",
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Answer area / results */}
            {phase !== "result" ? (
              <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
                <div
                  style={{
                    position: "relative",
                    marginBottom: "16px",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setCharCount(e.target.value.length);
                    }}
                    disabled={phase === "submitting"}
                    placeholder="Begin your response..."
                    rows={10}
                    style={{
                      width: "100%",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
                      padding: "24px",
                      color: "var(--text)",
                      fontFamily: "var(--font-body)",
                      fontSize: "18px",
                      lineHeight: 1.85,
                      resize: "vertical",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--cyan)";
                      e.currentTarget.style.boxShadow = "0 0 16px var(--cyan-glow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: "13px",
                        color: charCount < 20 ? "#ef4444" : "var(--muted)",
                      }}
                    >
                      {charCount} chars {charCount < 20 && "— min 20 required"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={handleSpeechToggle}
                        disabled={phase === "submitting" || !isSpeechSupported}
                        style={{
                          borderColor: isListening ? "var(--red)" : undefined,
                          color: isListening ? "var(--red)" : undefined,
                          opacity: phase === "submitting" || !isSpeechSupported ? 0.45 : 1,
                          cursor:
                            phase === "submitting" || !isSpeechSupported ? "not-allowed" : "pointer",
                        }}
                      >
                        {isListening ? "Stop Recording" : "Speech to Text"}
                      </button>
                      <span
                        className="mono"
                        style={{
                          fontSize: "12px",
                          color: isListening ? "var(--red)" : "var(--muted)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {!isSpeechSupported
                          ? "Speech input unavailable"
                          : isListening
                            ? "Listening..."
                            : "Mic ready"}
                      </span>
                    </div>
                    {speechError && (
                      <span
                        style={{
                          fontSize: "14px",
                          color: "var(--amber)",
                          lineHeight: 1.6,
                        }}
                      >
                        {speechError}
                      </span>
                    )}
                  </div>

                  <button
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={phase === "submitting" || answer.trim().length < 20}
                    style={{
                      opacity: answer.trim().length >= 20 && phase !== "submitting" ? 1 : 0.4,
                      cursor:
                        answer.trim().length >= 20 && phase !== "submitting"
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    {phase === "submitting" ? "Analyzing..." : "Submit Answer →"}
                  </button>
                </div>
              </div>
            ) : (
              score && (
                <div
                  className="interview-result-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 360px)",
                    gap: "24px",
                    alignItems: "start",
                  }}
                >
                  <ScoreCard score={score} submittedAnswer={answer} />
                  <FeedbackPanel
                    score={score}
                    onRetry={handleRetry}
                    onNext={handleNext}
                    onGenerateAiFeedback={score.ai_feedback ? undefined : handleGenerateAiFeedback}
                    isGeneratingAiFeedback={isGeneratingAiFeedback}
                  />
                </div>
              )
            )}
          </>
        )}
        </main>
      </div>
    </div>
  );
}
