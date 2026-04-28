import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LevelSelector } from "../components/LevelSelector";
import { RoleSelector } from "../components/RoleSelector";
import { isAuthenticated, type CandidateLevel, type Role } from "../lib/api";

const COMPANIES = ["GOOGLE", "META", "STRIPE", "OPENAI", "NVIDIA", "DATABRICKS", "AIRBNB", "NETFLIX"];
const MARQUEE_COMPANIES = [...COMPANIES, ...COMPANIES];

export default function HomePage() {
  const [role, setRole] = useState<Role | null>("swe");
  const [level, setLevel] = useState<CandidateLevel>("new_grad");
  const navigate = useNavigate();

  return (
    <div>
      <section className="section-band" style={{ overflow: "hidden" }}>
        <div className="hero-grid" />
        <div
          style={{
            position: "absolute",
            top: "18%",
            right: "-120px",
            width: "520px",
            height: "520px",
            borderRadius: "999px",
            background: "radial-gradient(circle, var(--acid-dim), transparent 62%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <div
          className="shell-width"
          style={{
            position: "relative",
            padding: "64px 0 84px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(360px, 0.9fr)",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div className="chip">
              <span className="status-dot" style={{ width: "6px", height: "6px" }} />
              Sim engine v2.4 // online
            </div>
            <h1 style={{ fontSize: "clamp(56px, 8vw, 104px)", lineHeight: 0.88, fontWeight: 700 }}>
              Crack the
              <br />
              <span style={{ color: "var(--text-soft)" }}>Corporate</span>
              <br />
              <span style={{ color: "var(--acid)" }}>Firewall.</span>
            </h1>
            <p className="muted" style={{ fontSize: "18px", maxWidth: "40rem" }}>
              Role-based AI interview drills for SWE, data, PM, and behavioral loops. Pick the track, survive the question set, and inspect the scoring signal after every answer.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate(`/interview?role=${role ?? "swe"}&level=${level}`)}
              >
                Initialize Sequence →
              </button>
              <span className="mono" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>
                {isAuthenticated() ? "history sync enabled" : "sign in for scoring + history"}
              </span>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "0.12s" }}>
            <div className="terminal-window">
              <div className="terminal-topbar">
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: 999, background: "var(--border-strong)" }} />
                  <span style={{ width: "8px", height: "8px", borderRadius: 999, background: "var(--border-strong)" }} />
                  <span style={{ width: "8px", height: "8px", borderRadius: 999, background: "var(--border-strong)" }} />
                </div>
                <span className="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>
                  sys@interview-ace: ~/loop-sim
                </span>
              </div>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="mono" style={{ fontSize: "12px", color: "var(--muted)", display: "grid", gap: "4px" }}>
                  <span>[08:42:11] Target locked: STRIPE / SWE</span>
                  <span>[08:42:12] Injecting follow-up pressure...</span>
                  <span style={{ color: "var(--acid)" }}>[08:42:13] Simulation live.</span>
                </div>
                <div style={{ borderLeft: "2px solid var(--acid)", paddingLeft: "16px" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.75 }}>
                    [Interviewer_AI]: You are designing an idempotency layer for multi-region writes at 80k req/s. Two requests arrive with the same key 3ms apart in different regions. Walk through the design, failure modes, and tradeoffs.
                  </p>
                </div>
                <div className="mono" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--acid)" }}>
                  <span>{">"}</span>
                  <span style={{ width: "10px", height: "18px", background: "var(--text)", animation: "blink 1s step-end infinite" }} />
                </div>
              </div>
              <div
                className="mono"
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                <span>depth: l4</span>
                <span>threat: <span style={{ color: "var(--acid)" }}>0.92</span></span>
                <span>elapsed: 03:12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
        <div className="shell-width" style={{ padding: "20px 0" }}>
          <div className="eyebrow" style={{ marginBottom: "12px" }}>
            // modeled interview loops
          </div>
          <div className="marquee-fade">
            <div
              className="animate-marquee"
              style={{
                display: "flex",
                width: "max-content",
                gap: "22px",
                fontFamily: "var(--font-head)",
                fontSize: "34px",
                fontWeight: 800,
                color: "var(--text-band)",
                whiteSpace: "nowrap",
              }}
            >
              {MARQUEE_COMPANIES.map((company, index) => (
                <span key={`${company}-${index}`}>
                  {company} <span style={{ color: "var(--acid)" }}>·</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell-width" style={{ padding: "72px 0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: "24px", marginBottom: "24px" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              // 02 - tracks
            </div>
            <h2 style={{ fontSize: "clamp(42px, 5vw, 68px)", lineHeight: 0.92, fontWeight: 700 }}>
              Four loops.
              <br />
              One interface.
            </h2>
          </div>
        </div>
        <RoleSelector selected={role} onChange={setRole} />
      </section>

      <section className="shell-width" style={{ padding: "28px 0 72px" }}>
        <div className="eyebrow" style={{ marginBottom: "12px" }}>
          // 03 - level
        </div>
        <div style={{ marginBottom: "20px", maxWidth: "46rem" }}>
          <h2 style={{ fontSize: "clamp(34px, 4vw, 52px)", lineHeight: 0.94, fontWeight: 700, marginBottom: "10px" }}>
            Pick the pressure band.
          </h2>
          <p className="muted">Choose a question set calibrated for either entry-level fundamentals or new-grad ownership and depth.</p>
        </div>
        <LevelSelector selected={level} onChange={setLevel} />
      </section>
    </div>
  );
}
