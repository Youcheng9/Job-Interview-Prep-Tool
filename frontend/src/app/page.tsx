import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RoleSelector } from "../components/RoleSelector";
import type { Role } from "../lib/api";

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
        minHeight: "100vh",
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
          maxWidth: "860px",
          margin: "0 auto",
          padding: "80px 24px 60px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "56px", textAlign: "center" }}>
          {/* System label */}
          <div
            className="mono animate-fade-up"
            style={{
              fontSize: "11px",
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
              fontSize: "14px",
              color: "var(--muted)",
              letterSpacing: "0.04em",
              maxWidth: "480px",
              margin: "0 auto",
              lineHeight: 1.7,
              animationDelay: "160ms",
            }}
          >
            AI-powered interview analysis. Submit your answer — receive a
            multi-dimensional score with precision feedback.
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
              fontSize: "10px",
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
              fontSize: "14px",
              padding: "14px 48px",
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
                  fontSize: "22px",
                  color: "var(--cyan)",
                  marginBottom: "4px",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "10px",
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
      </div>
    </div>
  );
}