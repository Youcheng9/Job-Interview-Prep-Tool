import type { CSSProperties } from "react";
import type { ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  submittedAnswer?: string;
}

const scaledFont = (px: number) => `calc(${px}px * var(--result-card-font-scale))`;

function RingScore({ value }: { value: number }) {
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  const color =
    value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
      <svg width="132" height="132" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: scaledFont(34), color, lineHeight: 1 }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: scaledFont(11),
            letterSpacing: "0.12em",
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          Score
        </span>
      </div>
    </div>
  );
}

export function ScoreCard({ score, submittedAnswer }: Props) {
  return (
    <div
      className="panel animate-fade-up"
      style={{
        padding: "30px",
        gap: "28px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "--result-card-font-scale": 1.2,
      } as CSSProperties}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <RingScore value={score.overall} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: scaledFont(13),
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Evaluation Complete
          </div>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: scaledFont(28),
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color:
                score.overall >= 75
                  ? "#22c55e"
                  : score.overall >= 50
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          >
            {score.overall >= 75
              ? "Strong Answer"
              : score.overall >= 50
              ? "Needs Work"
              : "Insufficient"}
          </div>
        </div>
      </div>

      {/* Feedback */}
      {score.feedback && (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderLeft: "2px solid var(--cyan)",
            padding: "18px 20px",
            fontSize: scaledFont(16),
            color: "var(--text)",
            lineHeight: 1.7,
            marginBottom: "16px",
          }}
        >
          {score.feedback}
        </div>
      )}

      {score.scoring_degraded && (
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.22)",
            borderLeft: "2px solid var(--amber)",
            padding: "14px 16px",
            fontSize: scaledFont(14),
            color: "var(--text)",
            lineHeight: 1.7,
            marginBottom: "16px",
          }}
        >
          Scoring ran in degraded mode because the embedding backend was unavailable.
        </div>
      )}

      {submittedAnswer?.trim() && (
        <div
          style={{
            marginBottom: "16px",
            flex: "1 1 auto",
            minHeight: "220px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: scaledFont(12),
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              marginBottom: "10px",
            }}
          >
            Your Answer
          </div>
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "18px 20px",
              fontSize: scaledFont(15),
              color: "var(--text)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            {submittedAnswer}
          </div>
        </div>
      )}

      {/* Strengths + Missing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {score.strengths?.length > 0 && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: scaledFont(12),
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#22c55e",
                marginBottom: "8px",
              }}
            >
              ✓ Strengths
            </div>
            {score.strengths.map((s) => (
              <div
                key={s}
                style={{
                  fontSize: scaledFont(15),
                  color: "var(--muted)",
                  paddingLeft: "12px",
                  borderLeft: "1px solid #22c55e40",
                  marginBottom: "4px",
                  lineHeight: 1.5,
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
        {score.missing_concepts?.length > 0 && (
          <div>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: scaledFont(12),
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#ef4444",
                marginBottom: "8px",
              }}
            >
              ✗ Missing
            </div>
            {score.missing_concepts.map((c) => (
              <div
                key={c}
                style={{
                  fontSize: scaledFont(15),
                  color: "var(--muted)",
                  paddingLeft: "12px",
                  borderLeft: "1px solid #ef444440",
                  marginBottom: "4px",
                  lineHeight: 1.5,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
