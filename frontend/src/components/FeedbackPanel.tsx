import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { FeedbackChatMessage, ScoreResult } from "../lib/api";

interface Props {
  score: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
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
  chatMessages = [],
  chatError = null,
  isLoadingChat = false,
  isSendingChat = false,
  onSendChatMessage,
}: Props) {
  const [chatDraft, setChatDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const instant = score.instant_feedback;
  const canSendChat = Boolean(onSendChatMessage) && Boolean(score.answerId);
  const coachPrompts = [
    "Rewrite my answer more strongly.",
    "Why was my completeness score low?",
    "What should I improve first?",
  ];

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

  async function handlePromptClick(prompt: string) {
    if (!canSendChat || isSendingChat) return;
    await onSendChatMessage?.(prompt);
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

      {instant && (
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
            Instant Summary
          </div>

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
            {instant.summary}
          </div>

          {(instant.improvements?.length ?? 0) > 0 && (
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
              {instant.improvements.map((item) => (
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

        </div>
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            {coachPrompts.map((prompt) => (
              <button
                key={prompt}
                className="btn-ghost"
                type="button"
                onClick={() => void handlePromptClick(prompt)}
                disabled={isSendingChat}
                style={{
                  opacity: isSendingChat ? 0.6 : 1,
                  cursor: isSendingChat ? "not-allowed" : "pointer",
                }}
              >
                {prompt}
              </button>
            ))}
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
