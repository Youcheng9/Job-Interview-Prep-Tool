import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RoleSelector } from "../components/RoleSelector";
import { isAuthenticated, type Role } from "../lib/api";

// Animated grid background
function GridBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Radial glow center */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(ellipse, rgba(13,148,136,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      {/* Scan line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(13,148,136,0.4), transparent)",
          animation: "scan-line 6s linear infinite",
        }}
      />
    </div>
  );
}

export default function HomePage() {
  const [role, setRole] = useState<Role | null>(null);
  const navigate = useNavigate();

  const handleStart = () => {
    if (role) navigate(`/interview?role=${role}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <GridBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "92px 32px 72px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "56px", textAlign: "center" }}>
          {/* System label */}
          <div
            className="mono animate-fade-up"
            style={{
              fontSize: "13px",
              letterSpacing: "0.2em",
              color: "var(--cyan)",
              marginBottom: "16px",
              opacity: 0.8,
            }}
          >
            SYS://INTERVIEW_PREP_v1.0 — INITIALIZED
          </div>

          {/* Main title */}
          <h1
            className="animate-fade-up glow-cyan"
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              letterSpacing: "0.06em",
              lineHeight: 1.1,
              marginBottom: "16px",
              animationDelay: "80ms",
              color: "var(--text)",
            }}
          >
            INTERVIEW{" "}
            <span style={{ color: "var(--cyan)" }}>INTEL</span>
          </h1>

          <p
            className="animate-fade-up"
            style={{
              fontSize: "18px",
              color: "var(--muted)",
              letterSpacing: "0.04em",
              maxWidth: "680px",
              margin: "0 auto",
              lineHeight: 1.7,
              animationDelay: "160ms",
            }}
          >
            AI-powered interview analysis. Submit your answer — receive a
            multi-dimensional score with precision feedback.
          </p>
          <p
            className="animate-fade-up"
            style={{
              fontSize: "14px",
              color: isAuthenticated() ? "var(--green)" : "var(--muted)",
              letterSpacing: "0.08em",
              marginTop: "14px",
              animationDelay: "220ms",
              textTransform: "uppercase",
            }}
          >
            {isAuthenticated() ? "Authenticated for scoring and history" : "Browse questions publicly, sign in to save scores"}
          </p>
        </div>

        {/* Divider */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "28px",
            animationDelay: "200ms",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span
            className="mono"
            style={{
              fontSize: "12px",
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Select Track
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Role selector */}
        <div
          className="animate-fade-up"
          style={{ marginBottom: "40px", animationDelay: "240ms" }}
        >
          <RoleSelector selected={role} onChange={setRole} />
        </div>

        {/* CTA */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            justifyContent: "center",
            animationDelay: "320ms",
          }}
        >
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={!role}
            style={{
              fontSize: "17px",
              padding: "18px 56px",
              opacity: role ? 1 : 0.35,
              cursor: role ? "pointer" : "not-allowed",
              letterSpacing: "0.15em",
            }}
          >
            Initialize Session →
          </button>
        </div>

        {/* Stats row */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "48px",
            marginTop: "64px",
            paddingTop: "32px",
            borderTop: "1px solid var(--border)",
            animationDelay: "400ms",
          }}
        >
          {[
            { val: "4", label: "Interview Tracks" },
            { val: "200+", label: "Questions" },
            { val: "4-Axis", label: "Scoring" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                className="mono"
                style={{
                  fontSize: "28px",
                  color: "var(--cyan)",
                  marginBottom: "4px",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div
          className="animate-fade-up"
          style={{
            marginTop: "72px",
            paddingTop: "32px",
            borderTop: "1px solid var(--border)",
            animationDelay: "480ms",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span
              className="mono"
              style={{
                fontSize: "12px",
                letterSpacing: "0.16em",
                color: "var(--cyan)",
                textTransform: "uppercase",
              }}
            >
              How It Works
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              {
                step: "01",
                title: "Pick A Track",
                desc: "Choose SWE, Data Science, PM, or Behavioral to load a role-specific question bank.",
              },
              {
                step: "02",
                title: "Sign In To Score",
                desc: "Create an account or log in so your submissions can be scored and saved to your history.",
              },
              {
                step: "03",
                title: "Answer A Question",
                desc: "Write your response in the interview workspace and submit it to the backend for evaluation.",
              },
              {
                step: "04",
                title: "Review Feedback",
                desc: "See your overall score, dimension breakdown, and follow-up improvement guidance after each attempt.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="panel"
                style={{
                  padding: "24px",
                  minHeight: "210px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: "13px",
                    color: "var(--cyan)",
                    letterSpacing: "0.16em",
                    marginBottom: "16px",
                  }}
                >
                  STEP {step}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-head)",
                    fontSize: "24px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--text)",
                    marginBottom: "12px",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    color: "var(--muted)",
                    lineHeight: 1.75,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
