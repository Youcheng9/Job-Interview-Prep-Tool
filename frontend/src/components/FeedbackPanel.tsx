import type { ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
}

const TIPS: Record<string, string[]> = {
  technical_depth: [
    "Include specific time/space complexity analysis",
    "Mention edge cases and how you handle them",
    "Reference concrete data structures or algorithms by name",
  ],
  clarity: [
    "Structure your answer with a clear beginning, middle, end",
    "Define terms before using them",
    "Use analogies to explain complex concepts",
  ],
  completeness: [
    "Cover all parts of the question, not just the first part",
    "Include trade-offs between approaches",
    "Mention follow-up considerations",
  ],
  structure: [
    "Start with a brief overview before diving deep",
    "Use numbered steps for processes",
    "Summarize key points at the end",
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
