import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LevelSelector } from "../components/LevelSelector";
import { RoleSelector } from "../components/RoleSelector";
import { isAuthenticated, type CandidateLevel, type Role } from "../lib/api";

const COMPANIES = ["Google", "Meta", "Stripe", "OpenAI", "NVIDIA", "Databricks", "Airbnb", "Netflix"];
const MARQUEE_GROUP_COUNT = 6;

const STATS = [
  { value: "4", label: "interview tracks", detail: "Software engineering, data, product, and behavioral practice." },
  { value: "Question-level", label: "feedback", detail: "Scorecards break down structure, signal, and technical depth." },
  { value: "Saved", label: "session history", detail: "Review previous answers, retry weak areas, and track improvement." },
];

const FEATURES = [
  {
    title: "Role-specific question banks",
    description: "Switch between SWE, data, PM, and behavioral interviews without leaving the same workflow.",
  },
  {
    title: "Follow-up pressure that adapts",
    description: "Prompts get sharper when your answer is vague, missing tradeoffs, or light on execution details.",
  },
  {
    title: "Scorecards you can act on",
    description: "Every round ends with concise scoring and concrete guidance instead of generic encouragement.",
  },
  {
    title: "Practice history and replay",
    description: "Return to past sessions, compare outcomes, and rerun the same track after you revise your answer.",
  },
  {
    title: "Level calibration",
    description: "Choose intern or new-grad expectations so the product meets the bar you are actually targeting.",
  },
  {
    title: "Faster prep loops",
    description: "Run a focused interview in minutes when you need one more rep before an application or onsite.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Choose the role and level",
    description: "Start from the interview you are actually preparing for instead of a generic prompt box.",
  },
  {
    step: "02",
    title: "Answer a realistic round",
    description: "Move through timed prompts and follow-ups that test communication, judgment, and technical depth.",
  },
  {
    step: "03",
    title: "Review the debrief",
    description: "See where the answer lost signal, then rerun the same category with a sharper response.",
  },
];

const LIBRARY_ROWS = [
  { track: "System design", focus: "tradeoffs, scale, edge cases", duration: "18 min" },
  { track: "Algorithms", focus: "clarity, complexity, communication", duration: "14 min" },
  { track: "Behavioral", focus: "story structure, ownership, impact", duration: "11 min" },
];

export default function HomePage() {
  const [role, setRole] = useState<Role | null>("swe");
  const [level, setLevel] = useState<CandidateLevel>("new_grad");
  const navigate = useNavigate();
  const authed = isAuthenticated();

  const launchHref = `/interview?role=${role ?? "swe"}&level=${level}`;
  const scrollToPracticeSetup = () => {
    const target = document.getElementById("practice-setup");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      <section className="section-band landing-hero">
        <div className="shell-width landing-hero-inner">
          <div className="landing-copy animate-fade-up">
            <h1 className="landing-title">Interview practice that feels like a real hiring loop.</h1>
            <p className="landing-lead">
              Train on role-specific prompts, get sharper follow-up questions, and review structured feedback after every answer. Built for candidates who need repetition, not novelty.
            </p>
            <div className="landing-actions">
              <button type="button" className="btn-primary" onClick={() => navigate(launchHref)}>
                Start practice
              </button>
              <Link to={authed ? "/history" : "/auth"} className="landing-secondary-link">
                <button type="button" className="btn-ghost">
                  {authed ? "View progress" : "Create account"}
                </button>
              </Link>
            </div>
          </div>

          <div className="landing-preview animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="product-frame">
              <div className="product-frame-header">
                <div>
                  <div className="eyebrow" style={{ marginBottom: "8px" }}>
                    Candidate workspace
                  </div>
                  <h2 style={{ fontSize: "28px", lineHeight: 1.05 }}>Today&apos;s prep plan</h2>
                </div>
                <div className="score-pill">New grad SWE</div>
              </div>

              <div className="preview-grid">
                <div className="panel preview-card">
                  <div className="eyebrow" style={{ marginBottom: "10px" }}>
                    Next interview
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Distributed systems screen</div>
                  <p className="muted" style={{ fontSize: "15px", marginBottom: "18px" }}>
                    Focus on write consistency, retries, and operational tradeoffs.
                  </p>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: "68%" }} />
                  </div>
                  <div className="preview-meta">
                    <span>3 of 5 drills completed</span>
                    <span>Target: Friday</span>
                  </div>
                </div>

                <div className="panel preview-card">
                  <div className="eyebrow" style={{ marginBottom: "10px" }}>
                    Last scorecard
                  </div>
                  <div className="score-breakdown">
                    <ScoreMetric label="Structure" value="8.4" />
                    <ScoreMetric label="Tradeoffs" value="7.8" />
                    <ScoreMetric label="Clarity" value="8.9" />
                  </div>
                  <p className="muted" style={{ fontSize: "14px", marginTop: "16px" }}>
                    Strong framing. You lost points when the answer skipped failure handling and monitoring.
                  </p>
                </div>

                <div className="panel preview-card preview-card-wide">
                  <div className="eyebrow" style={{ marginBottom: "10px" }}>
                    Practice library
                  </div>
                  <div className="library-table">
                    {LIBRARY_ROWS.map((row) => (
                      <div key={row.track} className="library-row">
                        <div>
                          <div style={{ fontWeight: 700 }}>{row.track}</div>
                          <div className="muted" style={{ fontSize: "14px" }}>
                            {row.focus}
                          </div>
                        </div>
                        <span className="library-duration">{row.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
        <div className="shell-width" style={{ padding: "20px 0" }}>
          <div className="eyebrow" style={{ marginBottom: "12px" }}>
            Interview formats inspired by top hiring bars
          </div>
          <div className="marquee-fade">
            <div
              className="marquee-track animate-marquee"
              style={{
                display: "flex",
                width: "max-content",
                fontFamily: "var(--font-head)",
                fontSize: "34px",
                fontWeight: 800,
                color: "var(--text-band)",
                whiteSpace: "nowrap",
              }}
            >
              {Array.from({ length: MARQUEE_GROUP_COUNT }, (_, group) => (
                <div key={group} className="marquee-group">
                  {COMPANIES.map((company) => (
                    <span key={`${group}-${company}`} className="marquee-item">
                      <span>{company}</span>
                      <span style={{ color: "var(--acid)" }}>·</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell-width landing-stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="panel stat-card">
            <div className="stat-value">{stat.value}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>{stat.label}</div>
            <p className="muted" style={{ fontSize: "14px" }}>
              {stat.detail}
            </p>
          </div>
        ))}
      </section>

      <section id="practice-setup" className="shell-width landing-section landing-anchor-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              Product tracks
            </div>
            <h2 className="landing-section-title">Prepare for the interview you actually have.</h2>
          </div>
          <p className="muted landing-section-copy">
            Each track uses its own question style and evaluation criteria so practice feels closer to the loop you are targeting.
          </p>
        </div>
        <RoleSelector selected={role} onChange={setRole} />
      </section>

      <section className="shell-width landing-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              Calibration
            </div>
            <h2 className="landing-section-title">Set the bar before you start.</h2>
          </div>
          <p className="muted landing-section-copy">
            Intern and new-grad sessions are scored differently so you get the right level of scrutiny and follow-up.
          </p>
        </div>
        <LevelSelector selected={level} onChange={setLevel} />
      </section>

      <section className="section-band">
        <div className="shell-width landing-section">
          <div className="landing-section-header">
            <div>
              <div className="eyebrow" style={{ marginBottom: "12px" }}>
                Why it works
              </div>
              <h2 className="landing-section-title">More signal, less prompt theater.</h2>
            </div>
            <p className="muted landing-section-copy">
              The experience is designed like a real prep tool: quick setup, focused repetition, and debriefs you can use on the next attempt.
            </p>
          </div>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="panel feature-card">
                <div className="feature-kicker" />
                <h3 style={{ fontSize: "22px", marginBottom: "10px" }}>{feature.title}</h3>
                <p className="muted" style={{ fontSize: "15px" }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell-width landing-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              Workflow
            </div>
            <h2 className="landing-section-title">A prep loop you can repeat every day.</h2>
          </div>
          <p className="muted landing-section-copy">
            The product stays useful when you are cramming for a screen, building confidence for an onsite, or sharpening a single weak area.
          </p>
        </div>

        <div className="workflow-grid">
          {WORKFLOW.map((item) => (
            <div key={item.step} className="panel workflow-card">
              <div className="workflow-step">{item.step}</div>
              <h3 style={{ fontSize: "24px", marginBottom: "10px" }}>{item.title}</h3>
              <p className="muted" style={{ fontSize: "15px" }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell-width landing-section">
        <div className="cta-band">
          <div>
            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              Start a round
            </div>
            <h2 className="landing-section-title" style={{ marginBottom: "12px" }}>
              Run one focused practice session now.
            </h2>
            <p className="muted landing-section-copy" style={{ maxWidth: "38rem" }}>
              Choose your track, answer a realistic set of questions, and leave with a scorecard you can use immediately.
            </p>
          </div>
          <div className="landing-actions">
            <button type="button" className="btn-primary" onClick={scrollToPracticeSetup}>
              Go To Practice
            </button>
            {!authed ? (
              <Link to="/auth" className="landing-secondary-link">
                <button type="button" className="btn-ghost">
                  Sign in to save history
                </button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="score-metric">
      <span className="muted" style={{ fontSize: "13px" }}>
        {label}
      </span>
      <strong style={{ fontSize: "26px" }}>{value}</strong>
    </div>
  );
}
