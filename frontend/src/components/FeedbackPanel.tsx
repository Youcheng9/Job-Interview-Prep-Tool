import type { ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
}

const TIPS: Record<string, string[]> = {
  technical_depth: [
    "Include specific technical terms and concepts from the domain",
    "Explain the 'why' behind technical choices or complexities",
    "Reference concrete algorithms, data structures, or methodologies by name",
    "Discuss trade-offs between different technical approaches",
  ],
  clarity: [
    "Structure your answer with a clear beginning, middle, end",
    "Define technical terms before using them",
    "Use concrete examples to illustrate abstract concepts",
    "Break down complex ideas into digestible parts",
  ],
  completeness: [
    "Cover all aspects of the question thoroughly",
    "Address edge cases, limitations, and assumptions",
    "Include relevant context and background information",
    "Mention alternative approaches and when to use them",
  ],
  structure: [
    "Start with a brief overview before diving into details",
    "Use transitional phrases like 'first', 'then', 'however', 'therefore'",
    "Organize your answer with clear logical flow",
    "End with a summary of key takeaways",
  ],
};

function ImprovementTip({ dim, score }: { dim: string; score: number }) {
  if (score >= 80) return null;
  const tips = TIPS[dim] ?? [];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px 18px",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        marginBottom: "8px",
        fontSize: "15px",
        color: "var(--muted)",
        lineHeight: 1.6,
      }}
    >
      <span style={{ color: "var(--amber)", flexShrink: 0, marginTop: "1px" }}>›</span>
      <span>{tip}</span>
    </div>
  );
}

export function FeedbackPanel({ score, onRetry, onNext }: Props) {
  const weakDims = (
    ["technical_depth", "clarity", "completeness", "structure"] as const
  ).filter((d) => (score[d] as number) < 80);
  const ai = score.ai_feedback;
  const aiError = score.ai_feedback_error;

  return (
    <div
      className="panel animate-fade-up"
      style={{ padding: "30px", animationDelay: "150ms" }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "var(--font-head)",
          fontSize: "16px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--cyan)",
          marginBottom: "20px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            background: "var(--cyan)",
            borderRadius: "50%",
            boxShadow: "0 0 8px var(--cyan)",
            animation: "flicker 4s infinite",
          }}
        />
        Improvement Protocol
      </div>

      {/* Tips for weak dims */}
      {ai && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              marginBottom: "12px",
            }}
          >
            AI Coach Summary
          </div>

          <div
            style={{
              padding: "18px 20px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--cyan)",
              fontSize: "15px",
              lineHeight: 1.7,
              color: "var(--text)",
              marginBottom: "12px",
            }}
          >
            {ai.summary}
          </div>

          {ai.improvements.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Recommended Improvements
              </div>
              {ai.improvements.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px 16px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    marginBottom: "8px",
                    fontSize: "15px",
                    color: "var(--muted)",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "var(--cyan)", flexShrink: 0 }}>+</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {ai.next_focus && (
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                fontSize: "14px",
                color: "var(--text)",
              }}
            >
              <span className="mono" style={{ color: "var(--cyan)", marginRight: "8px" }}>
                NEXT:
              </span>
              {ai.next_focus}
            </div>
          )}

          {ai.improved_answer && (
            <details style={{ marginBottom: "8px" }}>
              <summary
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                View Improved Answer
              </summary>
              <div
                style={{
                  marginTop: "10px",
                  padding: "16px 18px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  fontSize: "15px",
                  color: "var(--muted)",
                  lineHeight: 1.75,
                }}
              >
                {ai.improved_answer}
              </div>
            </details>
          )}
        </div>
      )}

      {!ai && aiError && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px 18px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.22)",
            borderLeft: "2px solid var(--amber)",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "var(--text)",
          }}
        >
          <span className="mono" style={{ color: "var(--amber)", marginRight: "8px" }}>
            AI COACH:
          </span>
          {aiError}
        </div>
      )}

      {weakDims.length > 0 ? (
        <>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            Focus Areas
          </div>
          {weakDims.map((d) => (
            <ImprovementTip key={d} dim={d} score={score[d] as number} />
          ))}
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            fontFamily: "var(--font-head)",
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: "#22c55e",
          }}
        >
          ✓ Excellent performance across all dimensions
        </div>
      )}

      {/* Performance summary stat */}
      <div
        style={{
          marginTop: "20px",
          padding: "14px",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Dimensions at target
        </span>
        <span className="mono" style={{ fontSize: "24px", color: "var(--cyan)" }}>
          {4 - weakDims.length}
          <span style={{ color: "var(--muted)", fontSize: "16px" }}> / 4</span>
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button className="btn-ghost" onClick={onRetry} style={{ flex: 1 }}>
          Retry
        </button>
        <button className="btn-primary" onClick={onNext} style={{ flex: 1 }}>
          Next Question
        </button>
      </div>
    </div>
  );
}
