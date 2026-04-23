import { useEffect, useRef } from "react";
import type { ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  submittedAnswer?: string;
}

const DIMS: { key: keyof ScoreResult; label: string; color: string }[] = [
  { key: "technical_depth", label: "Technical Depth", color: "#0d9488" },
  { key: "clarity",         label: "Clarity",         color: "#6366f1" },
  { key: "completeness",    label: "Completeness",     color: "#f59e0b" },
  { key: "structure",       label: "Structure",        color: "#ec4899" },
];

function ScoreBar({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.style.width = `${value}%`;
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {label}
        </span>
        <span
          className="mono"
          style={{ fontSize: "16px", color }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: "var(--surface2)",
          borderRadius: "2px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: "0%",
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            borderRadius: "2px",
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

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
          style={{ fontSize: "34px", color, lineHeight: 1 }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "11px",
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
      style={{ padding: "30px", gap: "28px" }}
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
              fontSize: "13px",
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
              fontSize: "28px",
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

      {/* Dimension bars */}
      <div style={{ marginBottom: "24px" }}>
        {DIMS.map((d, i) => (
          <ScoreBar
            key={d.key}
            label={d.label}
            value={score[d.key] as number}
            color={d.color}
            delay={i * 120}
          />
        ))}
      </div>

      {/* Feedback */}
      {score.feedback && (
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderLeft: "2px solid var(--cyan)",
            padding: "18px 20px",
            fontSize: "16px",
            color: "var(--text)",
            lineHeight: 1.7,
            marginBottom: "16px",
          }}
        >
          {score.feedback}
        </div>
      )}

      {submittedAnswer?.trim() && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: "12px",
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
              fontSize: "15px",
              color: "var(--text)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "320px",
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
                fontSize: "12px",
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
                  fontSize: "15px",
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
                fontSize: "12px",
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
                  fontSize: "15px",
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
