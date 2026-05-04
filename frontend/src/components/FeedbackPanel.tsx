import type { CSSProperties } from "react";
import type { ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
  onGenerateAiFeedback?: () => void;
  isGeneratingAiFeedback?: boolean;
  aiFeedbackPollAttempts?: number;
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

const scaledFont = (px: number) => `calc(${px}px * var(--result-card-font-scale))`;

function ImprovementTip({ tip }: { tip: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px 18px",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        marginBottom: "8px",
        fontSize: scaledFont(15),
        color: "var(--muted)",
        lineHeight: 1.6,
      }}
    >
      <span style={{ color: "var(--amber)", flexShrink: 0, marginTop: "1px" }}>{">"}</span>
      <span>{tip}</span>
    </div>
  );
}

function getFocusAreaTips(score: ScoreResult): string[] {
  const weaknessTips = score.weaknesses.filter(Boolean).slice(0, 4);
  if (weaknessTips.length > 0) {
    return weaknessTips;
  }

  const weakDims = (
    ["technical_depth", "clarity", "completeness", "structure"] as const
  ).filter((d) => (score[d] as number) < 80);

  const fallbackTips = weakDims
    .map((dim) => {
      const tips = TIPS[dim] ?? [];
      return tips[0];
    })
    .filter(Boolean);

  if (score.missing_concepts.length > 0) {
    fallbackTips.unshift(`Address these missing concepts directly: ${score.missing_concepts.slice(0, 2).join(", ")}.`);
  }

  return Array.from(new Set(fallbackTips)).slice(0, 4);
}

export function FeedbackPanel({
  score,
  onRetry,
  onNext,
  onGenerateAiFeedback,
  isGeneratingAiFeedback = false,
  aiFeedbackPollAttempts = 0,
}: Props) {
  const weakDims = (
    ["technical_depth", "clarity", "completeness", "structure"] as const
  ).filter((d) => (score[d] as number) < 80);
  const focusAreaTips = getFocusAreaTips(score);
  const ai = score.ai_feedback;
  const aiError = score.ai_feedback_error;
  const aiSource = score.ai_feedback_source;
  const isFallbackFeedback = aiSource === "fallback";
  const isAiPending = Boolean(score.ai_feedback_pending) && !ai;
  const canGenerateAiFeedback =
    Boolean(onGenerateAiFeedback) &&
    (!ai || isFallbackFeedback) &&
    !isGeneratingAiFeedback;

  return (
    <div
      className="panel animate-fade-up"
      style={{
        padding: "30px",
        animationDelay: "150ms",
        "--result-card-font-scale": 1.2,
      } as CSSProperties}
    >
      <div
        style={{
          fontFamily: "var(--font-head)",
          fontSize: scaledFont(16),
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

      {ai && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: scaledFont(12),
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              marginBottom: "12px",
            }}
          >
            {isFallbackFeedback ? "Fallback Coach Summary" : "AI Coach Summary"}
          </div>

          {isFallbackFeedback && (
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
                borderLeft: "2px solid var(--amber)",
                fontSize: scaledFont(14),
                lineHeight: 1.7,
                color: "var(--text)",
              }}
            >
              This is fallback guidance from deterministic scoring because the live model response was unavailable.
            </div>
          )}

          <div
            style={{
              padding: "18px 20px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--cyan)",
              fontSize: scaledFont(15),
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
                  fontSize: scaledFont(12),
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
                    fontSize: scaledFont(15),
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
                fontSize: scaledFont(14),
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
                  fontSize: scaledFont(12),
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
                  fontSize: scaledFont(15),
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

      {!ai && (isAiPending || !aiError) && onGenerateAiFeedback && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px 18px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: scaledFont(14),
              lineHeight: 1.7,
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            {isAiPending
              ? aiFeedbackPollAttempts >= 4
                ? "AI coaching is taking longer than expected. Use the button below to force a direct generation attempt."
                : "AI coaching is being generated in the background. We will retry a few times automatically."
              : "Deterministic scoring is ready. AI coaching is optional and may take longer depending on your local Ollama model."}
          </div>
          <button
            className="btn-ghost"
            type="button"
            onClick={onGenerateAiFeedback}
            disabled={!canGenerateAiFeedback}
            style={{
              opacity: canGenerateAiFeedback ? 1 : 0.6,
              cursor: canGenerateAiFeedback ? "pointer" : "not-allowed",
            }}
          >
            {isGeneratingAiFeedback
              ? "Generating AI Feedback..."
              : isAiPending && aiFeedbackPollAttempts >= 4
                ? "Force AI Coach Generation"
                : isAiPending
                ? "Refresh AI Coach Feedback"
                : "Generate AI Coach Feedback"}
          </button>
        </div>
      )}

      {aiError && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px 18px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.22)",
            borderLeft: "2px solid var(--amber)",
            fontSize: scaledFont(14),
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

      {isFallbackFeedback && onGenerateAiFeedback && (
        <button
          className="btn-ghost"
          type="button"
          onClick={onGenerateAiFeedback}
          disabled={!canGenerateAiFeedback}
          style={{
            marginBottom: "20px",
            opacity: canGenerateAiFeedback ? 1 : 0.6,
            cursor: canGenerateAiFeedback ? "pointer" : "not-allowed",
          }}
        >
          {isGeneratingAiFeedback ? "Retrying AI Feedback..." : "Retry With Live AI Model"}
        </button>
      )}

      {focusAreaTips.length > 0 ? (
        <>
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: scaledFont(12),
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            Focus Areas
          </div>
          {focusAreaTips.map((tip) => (
            <ImprovementTip key={tip} tip={tip} />
          ))}
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            fontFamily: "var(--font-head)",
            fontSize: scaledFont(18),
            letterSpacing: "0.08em",
            color: "#22c55e",
          }}
        >
          Excellent performance across all dimensions
        </div>
      )}

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
            fontSize: scaledFont(12),
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Dimensions at target
        </span>
        <span className="mono" style={{ fontSize: scaledFont(24), color: "var(--cyan)" }}>
          {4 - weakDims.length}
          <span style={{ color: "var(--muted)", fontSize: scaledFont(16) }}> / 4</span>
        </span>
      </div>

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
