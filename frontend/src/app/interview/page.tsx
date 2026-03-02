import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ScoreCard } from "../../components/ScoreCard";
import { FeedbackPanel } from "../../components/FeedbackPanel";
import { getQuestions, submitAnswer, type Question, type ScoreResult, type Role } from "../../lib/api";

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
        fontSize: "10px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c,
        border: `1px solid ${c}40`,
        background: `${c}12`,
        padding: "2px 8px",
      }}
    >
      {level}
    </span>
  );
}

type Phase = "question" | "submitting" | "result";

export default function InterviewPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = (params.get("role") ?? "swe") as Role;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("question");
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getQuestions(role)
      .then(setQuestions)
      .catch(() => setError("Failed to load questions."));
  }, [role]);

  const question = questions[qIndex];
  const progress = questions.length ? ((qIndex + 1) / questions.length) * 100 : 0;

  async function handleSubmit() {
    if (!question || answer.trim().length < 20) return;
    setPhase("submitting");
    setError(null);
    try {
      const result = await submitAnswer(question.id, answer);
      setScore(result);
      setPhase("result");
    } catch {
      setError("Scoring failed. Please retry.");
      setPhase("question");
    }
  }

  function handleNext() {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setAnswer("");
      setScore(null);
      setPhase("question");
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      navigate("/history");
    }
  }

  function handleRetry() {
    setAnswer("");
    setScore(null);
    setPhase("question");
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
          style={{ color: "var(--cyan)", letterSpacing: "0.15em", fontSize: "12px" }}
        >
          LOADING QUESTION BANK...
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
      style={{
        minHeight: "100vh",
        padding: "0 0 60px",
        position: "relative",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          ← Exit
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            className="mono"
            style={{ fontSize: "11px", color: "var(--muted)" }}
          >
            {qIndex + 1} / {questions.length || "?"}
          </span>
          <span
            className="mono"
            style={{
              fontSize: "11px",
              color: "var(--cyan)",
              background: "var(--cyan-glow)",
              padding: "2px 10px",
              border: "1px solid var(--cyan)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {role.toUpperCase()}
          </span>
        </div>

        <Link
          to="/history"
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          History →
        </Link>
      </div>

      {/* Progress bar */}
      <div style={{ height: "2px", background: "var(--border)" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--cyan-dim), var(--cyan))",
            transition: "width 0.6s ease",
            boxShadow: "0 0 8px var(--cyan)",
          }}
        />
      </div>

      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "40px 24px 0",
        }}
      >
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid #ef444440",
              borderLeft: "2px solid #ef4444",
              padding: "12px 16px",
              fontSize: "13px",
              color: "#ef4444",
              marginBottom: "20px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ERROR: {error}
          </div>
        )}

        {question && (
          <>
            {/* Question panel */}
            <div
              className="panel animate-fade-up"
              style={{ padding: "28px", marginBottom: "24px" }}
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
                    fontSize: "11px",
                    color: "var(--cyan)",
                    letterSpacing: "0.15em",
                  }}
                >
                  Q_{String(qIndex + 1).padStart(3, "0")}
                </span>
                <DiffBadge level={question.difficulty} />
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              <p
                style={{
                  fontSize: "18px",
                  fontFamily: "var(--font-head)",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  lineHeight: 1.6,
                  color: "var(--text)",
                  minHeight: "60px",
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
                      fontSize: "10px",
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
                          fontSize: "11px",
                          color: "var(--muted)",
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          padding: "3px 10px",
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
                  {/* Corner brackets on textarea */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 12,
                      height: 12,
                      borderTop: "2px solid var(--cyan)",
                      borderLeft: "2px solid var(--cyan)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderBottom: "2px solid var(--cyan)",
                      borderRight: "2px solid var(--cyan)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  />
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
                      padding: "20px",
                      color: "var(--text)",
                      fontFamily: "var(--font-body)",
                      fontSize: "14px",
                      lineHeight: 1.8,
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
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: "11px",
                      color: charCount < 20 ? "#ef4444" : "var(--muted)",
                    }}
                  >
                    {charCount} chars {charCount < 20 && "— min 20 required"}
                  </span>

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
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 300px",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  <ScoreCard score={score} />
                  <FeedbackPanel
                    score={score}
                    onRetry={handleRetry}
                    onNext={handleNext}
                  />
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}