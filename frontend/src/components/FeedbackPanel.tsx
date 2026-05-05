import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { FeedbackChatMessage, ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
  onGenerateAiFeedback?: () => void;
  isGeneratingAiFeedback?: boolean;
  aiFeedbackPollAttempts?: number;
  chatMessages?: FeedbackChatMessage[];
  chatError?: string | null;
  isLoadingChat?: boolean;
  isSendingChat?: boolean;
  onSendChatMessage?: (content: string) => Promise<void> | void;
}

const scaledFont = (px: number) => `calc(${px}px * var(--result-card-font-scale))`;

export function FeedbackPanel({
  score,
  onRetry,
  onNext,
  onGenerateAiFeedback,
  isGeneratingAiFeedback = false,
  aiFeedbackPollAttempts = 0,
  chatMessages = [],
  chatError = null,
  isLoadingChat = false,
  isSendingChat = false,
  onSendChatMessage,
}: Props) {
  const [chatDraft, setChatDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const instant = score.instant_feedback;
  const ai = score.ai_feedback;
  const aiError = score.ai_feedback_error;
  const aiSource = score.ai_feedback_source;
  const isFallbackFeedback = aiSource === "fallback";
  const isAiPending = Boolean(score.ai_feedback_pending) && !ai;
  const visibleSummary = ai ?? instant;
  const canGenerateAiFeedback =
    Boolean(onGenerateAiFeedback) &&
    (!ai || isFallbackFeedback) &&
    !isGeneratingAiFeedback;
  const canSendChat = Boolean(onSendChatMessage) && Boolean(score.answerId);

  useEffect(() => {
    setChatDraft("");
  }, [score.answerId]);

  useEffect(() => {
    if (!canSendChat || isLoadingChat) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [canSendChat, chatMessages, isLoadingChat, isSendingChat]);

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSendChat || isSendingChat || !chatDraft.trim()) return;
    const nextMessage = chatDraft.trim();
    setChatDraft("");
    await onSendChatMessage?.(nextMessage);
  }

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

      {visibleSummary && (
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
            {ai ? (isFallbackFeedback ? "Fallback Coach Summary" : "AI Coach Summary") : "Instant Summary"}
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
              Live AI coaching was unavailable, so this fallback guidance was generated from deterministic scoring.
            </div>
          )}

          {!ai && isAiPending && (
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.18)",
                borderLeft: "2px solid #22c55e",
                fontSize: scaledFont(14),
                lineHeight: 1.7,
                color: "var(--text)",
              }}
            >
              Instant guidance is ready. Richer AI coaching is still being generated in the background.
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
            {visibleSummary.summary}
          </div>

          {(visibleSummary.improvements?.length ?? 0) > 0 && (
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
              {visibleSummary.improvements.map((item) => (
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

          {visibleSummary.next_focus && (
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
              {visibleSummary.next_focus}
            </div>
          )}

          {ai?.improved_answer && (
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
              ? aiFeedbackPollAttempts >= 6
                ? "AI coaching is taking longer than expected. Use the button below to force a direct generation attempt."
                : "AI coaching is being generated in the background. We will keep checking automatically."
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

      {aiError && !isFallbackFeedback && (
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

      {canSendChat && (
        <div
          style={{
            marginTop: "20px",
            padding: "24px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
          }}
        >
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
            Coach Chat
          </div>

          <div
            style={{
              fontSize: scaledFont(14),
              lineHeight: 1.6,
              color: "var(--muted)",
              marginBottom: "16px",
            }}
          >
            Ask focused follow-ups about this answer only. Keep prompts short for the fastest response.
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              minHeight: "320px",
              maxHeight: "420px",
              overflowY: "auto",
              marginBottom: "16px",
              paddingRight: "4px",
            }}
          >
            {isLoadingChat ? (
              <div style={{ fontSize: scaledFont(14), color: "var(--muted)" }}>Loading coach chat...</div>
            ) : chatMessages.length === 0 ? (
              <div style={{ fontSize: scaledFont(14), color: "var(--muted)" }}>
                Try: “Why was my completeness low?” or “Rewrite this more strongly.”
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      padding: "16px 18px",
                      border: "1px solid var(--border)",
                      background: message.role === "assistant" ? "rgba(185,255,57,0.08)" : "var(--bg)",
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: scaledFont(11),
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: message.role === "assistant" ? "var(--cyan)" : "var(--muted)",
                        marginBottom: "6px",
                      }}
                    >
                      {message.role === "assistant" ? "Coach" : "You"}
                    </div>
                    <div style={{ fontSize: scaledFont(15), color: "var(--text)", lineHeight: 1.75 }}>
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {chatError && (
            <div
              style={{
                marginBottom: "12px",
                padding: "12px 14px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
                color: "var(--text)",
                fontSize: scaledFont(13),
              }}
            >
              {chatError}
            </div>
          )}

          <form onSubmit={handleChatSubmit} style={{ display: "grid", gap: "10px" }}>
            <textarea
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              rows={5}
              maxLength={1500}
              placeholder="Ask the coach about this answer..."
              style={{
                resize: "vertical",
                minHeight: "132px",
                padding: "14px 16px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: scaledFont(15),
                lineHeight: 1.65,
              }}
            />
            <button
              className="btn-ghost"
              type="submit"
              disabled={isSendingChat || !chatDraft.trim()}
              style={{
                opacity: isSendingChat || !chatDraft.trim() ? 0.6 : 1,
                cursor: isSendingChat || !chatDraft.trim() ? "not-allowed" : "pointer",
              }}
            >
              {isSendingChat ? "Coach Thinking..." : "Send To Coach"}
            </button>
          </form>
        </div>
      )}

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
