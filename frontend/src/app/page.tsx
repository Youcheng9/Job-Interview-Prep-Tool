import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LevelSelector } from "../components/LevelSelector";
import { RoleSelector } from "../components/RoleSelector";
import { isAuthenticated, type CandidateLevel, type Role } from "../lib/api";
import { getSavedInterviewSession, readSavedQuestionId } from "../lib/interviewSession";

const COMPANIES = ["Google", "Meta", "Stripe", "OpenAI", "NVIDIA", "Databricks", "Airbnb", "Netflix"];
const MARQUEE_GROUP_COUNT = 6;

const STATS = [
  { value: "4", label: "interview tracks", detail: "Software engineering, data, product, and behavioral practice" },
  { value: "Question-level", label: "feedback", detail: "Scorecards break down structure, signal, and technical depth" },
  { value: "Saved", label: "session history", detail: "Review previous answers, retry weak areas, and track improvement" },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Choose the role and level",
    description: "Start from the interview you are actually preparing for instead of a generic prompt box",
  },
  {
    step: "02",
    title: "Answer a realistic round",
    description: "Move through timed prompts and follow-ups that test communication, judgment, and technical depth",
  },
  {
    step: "03",
    title: "Review the debrief",
    description: "See where the answer lost signal, then rerun the same category with a sharper response",
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
  const [levelConfirmed, setLevelConfirmed] = useState(false);
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const previousWork = authed ? getSavedInterviewSession() : null;

  const launchHref = `/interview?role=${role ?? "swe"}&level=${level}`;

  const hasSavedRound = () => {
    if (!role) return false;
    return readSavedQuestionId(role, level) !== null;
  };

  const scrollToLevelSetup = () => {
    const target = document.getElementById("level-setup");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToPracticeSetup = () => {
    const target = document.getElementById("practice-setup");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole);
    setLevelConfirmed(false);
    window.requestAnimationFrame(scrollToLevelSetup);
  };

  const handleLevelChange = (nextLevel: CandidateLevel) => {
    setLevel(nextLevel);
    setLevelConfirmed(true);
  };

  return (
    <div>
      <section className="section-band landing-hero">
        <div className="shell-width landing-hero-inner">
          <div className="landing-copy animate-fade-up">
            <h1 className="landing-title">Interview practice that feels like a real hiring loop</h1>
            <p className="landing-lead">
              Train on role-specific prompts, get sharper follow-up questions, and review structured feedback after every answer. Built for candidates who need repetition, not novelty
            </p>
            <div className="landing-actions hero-actions">
              <button type="button" className="btn-primary hero-action-button" onClick={() => navigate(launchHref)}>
                Start practice
              </button>
              <Link to={authed ? "/history" : "/auth"} className="landing-secondary-link">
                <button type="button" className="btn-ghost hero-action-button">
                  {authed ? "View progress" : "Create account"}
                </button>
              </Link>
              {previousWork ? (
                <button type="button" className="btn-resume hero-action-button" onClick={() => navigate(previousWork.href)}>
                  Resume work
                </button>
              ) : null}
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
                  <p className="muted" style={{ fontSize: "1.02rem", marginBottom: "18px" }}>
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
                  <p className="muted" style={{ fontSize: "1rem", marginTop: "16px" }}>
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
                          <div className="muted" style={{ fontSize: "1rem" }}>
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

      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="shell-width" style={{ padding: "20px 0" }}>
          <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
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
            <div style={{ fontSize: "1.22rem", fontWeight: 700, marginBottom: "8px" }}>{stat.label}</div>
            <p className="muted" style={{ fontSize: "1rem" }}>
              {stat.detail}
            </p>
          </div>
        ))}
      </section>

      <section id="practice-setup" className="shell-width landing-section landing-anchor-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
              Product tracks
            </div>
            <h2 className="landing-section-title">Prepare for the interview you actually have</h2>
            <p className="muted landing-section-copy product-tracks-section-copy">
              Each track uses its own question style and evaluation criteria so practice feels closer to the loop you are targeting
            </p>
          </div>
        </div>
        <RoleSelector selected={role} onChange={handleRoleChange} />
      </section>

      <section id="level-setup" className="shell-width landing-section landing-anchor-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
              Calibration
            </div>
            <h2 className="landing-section-title">Set the bar before you start</h2>
            <p className="muted landing-section-copy calibration-section-copy">
              Intern and new-grad sessions are scored differently so you get the right level of scrutiny and follow-up
            </p>
          </div>
        </div>
        <LevelSelector selected={level} onChange={handleLevelChange} />
        {levelConfirmed ? (
          <div className="level-start-actions">
            <button type="button" className="btn-primary level-start-button" onClick={() => navigate(launchHref)}>
              {hasSavedRound() ? "Continue Questions" : "Start Questions"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="shell-width landing-section">
        <div className="landing-section-header">
          <div>
            <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
              Workflow
            </div>
            <h2 className="landing-section-title">A prep loop you can repeat every day</h2>
            <p className="muted landing-section-copy workflow-section-copy">
              The product stays useful when you are cramming for a screen, building confidence for an onsite, or sharpening a single weak area
            </p>
          </div>
        </div>

        <div className="workflow-timeline" aria-label="Practice workflow">
          {WORKFLOW.map((item) => (
            <div key={item.step} className="workflow-node">
              <div className="workflow-node-top">
                <div className="workflow-index-ring">
                  <span className="workflow-index">{item.step}</span>
                </div>
                <div className="workflow-connector" />
              </div>
              <div className="workflow-body">
                <div className="workflow-step">Step {item.step}</div>
                <h3 className="workflow-title">{item.title}</h3>
                <p className="muted workflow-description">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shell-width landing-section">
        <div className="cta-band">
          <div className="cta-content">
            <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
              Start a round
            </div>
            <h2 className="landing-section-title" style={{ marginBottom: "12px" }}>
              Run one focused practice session now
            </h2>
            <p className="muted landing-section-copy">
              Choose your track, answer a realistic set of questions, and leave with a scorecard you can use immediately
            </p>
          </div>
          <div className="landing-actions cta-actions">
            <button type="button" className="btn-primary cta-practice-button" onClick={scrollToPracticeSetup}>
              Go To Practice
            </button>
            {previousWork ? (
              <button type="button" className="btn-resume cta-practice-button" onClick={() => navigate(previousWork.href)}>
                Resume work
              </button>
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
