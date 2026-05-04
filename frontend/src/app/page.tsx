import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LevelSelector } from "../components/LevelSelector";
import { RoleSelector } from "../components/RoleSelector";
import { isAuthenticated, type CandidateLevel, type Role } from "../lib/api";
import { getSavedInterviewSession, readSavedQuestionId } from "../lib/interviewSession";

const COMPANIES = ["Google", "Meta", "Stripe", "OpenAI", "NVIDIA", "Databricks", "Airbnb", "Netflix"];
const AUTH_COMPANIES = [
  "OpenAI",
  "Google",
  "Meta",
  "Stripe",
  "NVIDIA",
  "Databricks",
  "Airbnb",
  "Netflix",
  "Figma",
  "Notion",
  "Anthropic",
  "Scale AI",
];
const COMPANY_LOGOS: Record<string, string> = {
  OpenAI: "/company-icons/OpenAILogo.png",
  Google: "/company-icons/GoogleLogo.png",
  Meta: "/company-icons/MetaLogo.png",
  Stripe: "/company-icons/StripeLogo.png",
  NVIDIA: "/company-icons/Nvidia-Logo.png",
  Databricks: "/company-icons/Databricks_Logo.png",
  Airbnb: "/company-icons/AirbnbLogo.png",
  Netflix: "/company-icons/NetflixLogo.png",
  Figma: "/company-icons/FigmaLogo.png",
  Notion: "/company-icons/NotionLogo.png",
  Anthropic: "/company-icons/Anthropic.png",
  "Scale AI": "/company-icons/ScaleAILogo.png",
};
const MARQUEE_GROUP_COUNT = 6;
const AUTH_COMPANY_PAGE_SIZE = 9;

const STATS = [
  { value: "4", label: "interview tracks", detail: "Software engineering, data, product, and behavioral practice" },
  { value: "Question-level", label: "feedback", detail: "Scorecards break down structure, signal, and technical depth" },
  { value: "Saved", label: "session history", detail: "Review previous answers, retry weak areas, and track improvement" },
];

const PRACTICE_PREVIEW_QUESTIONS = [
  { id: "Q_001", title: "Caching invalidation tradeoffs", state: "Completed" },
  { id: "Q_002", title: "Design a rate limiter for a public API", state: "Active" },
  { id: "Q_003", title: "Retries, backoff, and idempotency", state: "Queued" },
];

const PRACTICE_PREVIEW_ANSWER = [
  "I would start with a token bucket per client so bursts are tolerated without losing control of the long-term rate.",
  "To keep the limit consistent across instances, I would store counters in Redis with short TTL windows and Lua for atomic updates.",
  "If Redis is unavailable, I would fail open for low-risk traffic but fail closed for expensive write paths and log the fallback.",
  "I would surface remaining quota headers and monitor rejected requests by tenant to catch abuse and bad defaults early.",
];

const PRACTICE_PREVIEW_FEEDBACK = [
  { label: "Structure", value: "8.8/10", width: "88%" },
  { label: "Tradeoffs", value: "8.1/10", width: "81%" },
  { label: "Depth", value: "7.9/10", width: "79%" },
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

const COMPARISON_ROWS = [
  {
    feature: "Real intern + new-grad loops by company",
    ours: true,
    others: "—",
  },
  {
    feature: "Voice answers, not just text",
    ours: true,
    others: "—",
  },
  {
    feature: "Scored against an ideal answer",
    ours: true,
    others: "Pass / fail",
  },
  {
    feature: "Behavioral + system design + DS/ML",
    ours: true,
    others: "DSA only",
  },
  {
    feature: "Targeted feedback in <10s",
    ours: true,
    others: "Peer-graded",
  },
] as const;

export default function HomePage() {
  const [role, setRole] = useState<Role | null>("swe");
  const [level, setLevel] = useState<CandidateLevel>("new_grad");
  const [levelConfirmed, setLevelConfirmed] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("OpenAI");
  const [companyPage, setCompanyPage] = useState(0);
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const previousWork = authed ? getSavedInterviewSession() : null;

  const launchHref = `/interview?role=${role ?? "swe"}&level=${level}&company=${encodeURIComponent(selectedCompany)}`;
  const authHref = `/auth?next=${encodeURIComponent(launchHref)}`;

  const hasSavedRound = () => {
    if (!role) return false;
    return readSavedQuestionId(role, level) !== null;
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
  };

  const handleLevelChange = (nextLevel: CandidateLevel) => {
    setLevel(nextLevel);
    setLevelConfirmed(true);
  };

  const companyPageCount = Math.ceil(AUTH_COMPANIES.length / AUTH_COMPANY_PAGE_SIZE);
  const visibleCompanies = AUTH_COMPANIES.slice(
    companyPage * AUTH_COMPANY_PAGE_SIZE,
    (companyPage + 1) * AUTH_COMPANY_PAGE_SIZE,
  );

  if (authed) {
    return (
      <div className="authed-landing">
        <section className="section-band authed-hero">
          <div className="shell-width authed-hero-shell">
            <div className="authed-welcome-card animate-fade-up">
              <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "14px" }}>
                Welcome back
              </div>
              <h1 className="authed-hero-title">Shape the next practice session before you start.</h1>
              <p className="authed-hero-copy">
                Pick a target company, lock the interview track, set the level, and launch a round that feels intentional instead of generic.
              </p>
              <div className="authed-hero-meta">
                <div className="authed-meta-chip">
                  <span className="mono">Target</span>
                  <strong>{selectedCompany}</strong>
                </div>
                <div className="authed-meta-chip">
                  <span className="mono">Track</span>
                  <strong>{role === "swe" ? "Software Engineering" : role === "data" ? "Data / ML" : role === "pm" ? "Product" : "Behavioral"}</strong>
                </div>
                <div className="authed-meta-chip">
                  <span className="mono">Level</span>
                  <strong>{level === "intern" ? "Intern" : "New Grad"}</strong>
                </div>
              </div>
              <div className="landing-actions" style={{ marginTop: "10px" }}>
                {previousWork ? (
                  <button type="button" className="btn-resume" onClick={() => navigate(previousWork.href)}>
                    Resume work
                  </button>
                ) : null}
                <Link to="/history" className="landing-secondary-link">
                  <button type="button" className="btn-ghost">
                    View progress
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="shell-width authed-flow">
          <section className="landing-section landing-anchor-section" id="practice-setup">
            <div className="landing-section-header">
              <div>
                <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
                  01 · Company
                </div>
                <h2 className="landing-section-title">Choose the company bar you want to rehearse against</h2>
                <p className="muted landing-section-copy">
                  Select the hiring context first. The interface keeps the same visual system across every choice so the flow feels consistent and focused.
                </p>
              </div>
            </div>

            <div className="auth-selection-card auth-company-shell">
              <div className="auth-company-grid">
                {visibleCompanies.map((company) => {
                  const active = selectedCompany === company;
                  const logoSrc = COMPANY_LOGOS[company];
                  return (
                    <button
                      key={company}
                      type="button"
                      className={`auth-option-card auth-company-card${active ? " auth-option-card-active" : ""}`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <span className="auth-company-logo-wrap" aria-hidden="true">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt=""
                            className="auth-company-logo"
                          />
                        ) : null}
                      </span>
                      <span className="mono auth-option-kicker">Company</span>
                      <span className="auth-option-title">{company}</span>
                    </button>
                  );
                })}
              </div>
              {companyPageCount > 1 ? (
                <div className="auth-pager">
                  <button
                    type="button"
                    className="auth-pager-button"
                    onClick={() => setCompanyPage((current) => Math.max(0, current - 1))}
                    disabled={companyPage === 0}
                  >
                    Previous page
                  </button>
                  <span className="mono auth-pager-meta">Page {companyPage + 1} / {companyPageCount}</span>
                  <button
                    type="button"
                    className="auth-pager-button"
                    onClick={() => setCompanyPage((current) => Math.min(companyPageCount - 1, current + 1))}
                    disabled={companyPage === companyPageCount - 1}
                  >
                    Next page
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="landing-section landing-anchor-section">
            <div className="landing-section-header">
              <div>
                <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
                  02 · Track
                </div>
                <h2 className="landing-section-title">Choose the interview track</h2>
                <p className="muted landing-section-copy">
                  Pick the loop you want to sharpen right now. Every option uses the same background tone and typography as the rest of the authenticated experience.
                </p>
              </div>
            </div>

            <div className="auth-selection-grid auth-track-grid">
              {[
                { id: "swe" as Role, code: "Core", label: "Software Engineering", desc: "Algorithms, systems, implementation detail, and tradeoff reasoning." },
                { id: "data" as Role, code: "Analytics", label: "Data / ML", desc: "Statistics, SQL, experimentation, debugging, and model judgment." },
                { id: "pm" as Role, code: "Product", label: "Product Management", desc: "Execution, prioritization, metrics, strategy, and stakeholder tradeoffs." },
                { id: "behavioral" as Role, code: "Stories", label: "Behavioral", desc: "Ownership, conflict, leadership, collaboration, and story structure." },
              ].map((item) => {
                const active = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`auth-option-card auth-track-card${active ? " auth-option-card-active" : ""}`}
                    onClick={() => handleRoleChange(item.id)}
                  >
                    <span className="mono auth-option-kicker">{item.code}</span>
                    <span className="auth-option-title">{item.label}</span>
                    <span className="auth-option-copy">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section id="level-setup" className="landing-section landing-anchor-section">
            <div className="landing-section-header">
              <div>
                <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
                  03 · Level
                </div>
                <h2 className="landing-section-title">Set the level and start the round</h2>
                <p className="muted landing-section-copy">
                  Finish by choosing the bar. The launch action stays at the end so the flow reads top to bottom without extra decisions.
                </p>
              </div>
            </div>

            <div className="auth-selection-grid auth-level-grid">
              {[
                {
                  id: "intern" as CandidateLevel,
                  code: "L1",
                  label: "Intern",
                  desc: "Foundational interviews focused on fundamentals, clear communication, and coachable reasoning.",
                },
                {
                  id: "new_grad" as CandidateLevel,
                  code: "L2",
                  label: "New Grad",
                  desc: "A higher bar for ownership, decision quality, and depth under tighter follow-up pressure.",
                },
              ].map((item) => {
                const active = level === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`auth-option-card auth-level-card${active ? " auth-option-card-active" : ""}`}
                    onClick={() => handleLevelChange(item.id)}
                  >
                    <span className="mono auth-option-kicker">{item.code}</span>
                    <span className="auth-option-title">{item.label}</span>
                    <span className="auth-option-copy">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="auth-launch-card">
              <div>
                <div className="eyebrow" style={{ marginBottom: "8px" }}>
                  Ready to start
                </div>
                <p className="muted">
                  Practicing for <strong style={{ color: "var(--text)" }}>{selectedCompany}</strong> in a{" "}
                  <strong style={{ color: "var(--text)" }}>{role === "swe" ? "Software Engineering" : role === "data" ? "Data / ML" : role === "pm" ? "Product" : "Behavioral"}</strong>{" "}
                  round at the <strong style={{ color: "var(--text)" }}>{level === "intern" ? "Intern" : "New Grad"}</strong> level.
                </p>
              </div>
              <button type="button" className="btn-primary level-start-button" onClick={() => navigate(launchHref)}>
                {hasSavedRound() ? "Continue Questions" : "Start Practice"}
              </button>
            </div>
          </section>
        </section>
      </div>
    );
  }

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
              <button
                type="button"
                className="btn-primary hero-action-button"
                onClick={scrollToPracticeSetup}
              >
                Start practice
              </button>
              <Link to={authed ? "/history" : authHref} className="landing-secondary-link">
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
            <div className="product-frame practice-demo-frame">
              <div className="product-frame-header">
                <div>
                  <div className="eyebrow" style={{ marginBottom: "8px" }}>
                    Practice interface
                  </div>
                  <h2 style={{ fontSize: "28px", lineHeight: 1.05 }}>Full interview loop, animated</h2>
                </div>
                <div className="score-pill">SWE · New grad</div>
              </div>

              <div className="practice-demo-shell" aria-label="Animated practice session preview">
                <aside className="practice-demo-sidebar panel">
                  <div className="practice-demo-sidebar-header">
                    <span className="eyebrow">Question bank</span>
                    <span className="practice-demo-sidebar-count">3 prompts</span>
                  </div>
                  <div className="practice-demo-sidebar-list">
                    {PRACTICE_PREVIEW_QUESTIONS.map((item, index) => (
                      <div
                        key={item.id}
                        className={`practice-demo-sidebar-item ${
                          index === 1 ? "practice-demo-sidebar-item-active" : ""
                        }`}
                      >
                        <div className="practice-demo-sidebar-id mono">{item.id}</div>
                        <div className="practice-demo-sidebar-copy">
                          <div className="practice-demo-sidebar-title">{item.title}</div>
                          <div className="practice-demo-sidebar-state">{item.state}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="practice-demo-main">
                  <div className="practice-demo-progress">
                    <div className="practice-demo-progress-bar">
                      <div className="practice-demo-progress-fill" />
                    </div>
                    <div className="practice-demo-progress-meta">
                      <span>Question 2 of 5</span>
                      <span>Generating feedback after submit</span>
                    </div>
                  </div>

                  <div className="practice-demo-panel-stack">
                    <section className="panel practice-demo-question-card">
                      <div className="practice-demo-loading">
                        <div className="practice-demo-loading-label mono">Loading next question</div>
                        <div className="practice-demo-loading-track">
                          <div className="practice-demo-loading-fill" />
                        </div>
                        <div className="practice-demo-loading-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>

                      <div className="practice-demo-question-body">
                        <div className="practice-demo-question-topline">
                          <span className="mono">Q_002</span>
                          <span className="practice-demo-badge">System Design</span>
                          <span className="practice-demo-badge practice-demo-badge-muted">Medium</span>
                        </div>
                        <h3 className="practice-demo-question-title">
                          Design a rate limiter for a public API used by mobile clients and third-party integrations.
                        </h3>
                        <p className="practice-demo-question-copy">
                          Explain how you would enforce limits across multiple servers, handle bursts, and keep the system fair during partial outages.
                        </p>
                      </div>
                    </section>

                    <section className="practice-demo-answer-card">
                      <div className="practice-demo-answer-header">
                        <span className="eyebrow">Candidate response</span>
                        <span className="practice-demo-answer-status">Typing answer</span>
                      </div>
                      <div className="practice-demo-answer-surface">
                        <div className="practice-demo-answer-lines" aria-hidden="true">
                          {PRACTICE_PREVIEW_ANSWER.map((line, index) => (
                            <div key={line} className={`practice-demo-answer-line practice-demo-answer-line-${index + 1}`}>
                              {line}
                            </div>
                          ))}
                          <div className="practice-demo-answer-caret" />
                        </div>
                        <div className="practice-demo-cursor" aria-hidden="true" />
                      </div>
                      <div className="practice-demo-answer-footer">
                        <span className="mono">214 chars</span>
                        <button type="button" className="btn-primary practice-demo-submit-button">
                          Submit answer
                        </button>
                      </div>
                    </section>

                    <section className="panel practice-demo-feedback-card">
                      <div className="practice-demo-feedback-loading">
                        <span className="eyebrow">Scoring response</span>
                        <div className="practice-demo-feedback-loader">
                          <span />
                          <span />
                          <span />
                        </div>
                        <p className="muted">Comparing structure, tradeoffs, and depth against the rubric.</p>
                      </div>

                      <div className="practice-demo-feedback-body">
                        <div className="practice-demo-feedback-header">
                          <span className="eyebrow">Feedback ready</span>
                          <span className="practice-demo-feedback-pill">Strong answer</span>
                        </div>
                        <div className="practice-demo-feedback-metrics">
                          {PRACTICE_PREVIEW_FEEDBACK.map((item, index) => (
                            <div
                              key={item.label}
                              className={`practice-demo-feedback-metric practice-demo-feedback-metric-${index + 1}`}
                            >
                              <div className="practice-demo-feedback-metric-row">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                              </div>
                              <div className="practice-demo-feedback-track">
                                <div className="practice-demo-feedback-fill" style={{ width: item.width }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="practice-demo-feedback-note">
                          Clear distributed design. Add explicit tenant isolation and quota reset behavior to push this into top-tier signal.
                        </p>
                      </div>
                    </section>
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
            <button
              type="button"
              className="btn-primary level-start-button"
              onClick={() => navigate(authed ? launchHref : authHref)}
            >
              {authed && hasSavedRound() ? "Continue Questions" : "Start Practice"}
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
        <div className="landing-section-header">
          <div>
            <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "12px" }}>
              COMPARISON
            </div>
            <h2 className="landing-section-title comparison-title" style={{ marginBottom: "12px" }}>
              <span className="comparison-title-primary">InterviewAI</span>{" "}
              <span className="comparison-title-secondary">vs the rest.</span>
            </h2>
          </div>
        </div>

        <div className="comparison-table-shell" role="table" aria-label="Comparison between InterviewAI and other services">
          <div className="comparison-table-header" role="row">
            <div className="comparison-table-cell comparison-table-cell-head comparison-table-cell-feature" role="columnheader">
              Feature
            </div>
            <div className="comparison-table-cell comparison-table-cell-head comparison-table-cell-ours-head" role="columnheader">
              InterviewAI
            </div>
            <div className="comparison-table-cell comparison-table-cell-head comparison-table-cell-others-head" role="columnheader">
              Others
            </div>
          </div>
          {COMPARISON_ROWS.map((row) => (
            <div key={row.feature} className="comparison-table-row" role="row">
              <div className="comparison-table-cell comparison-table-cell-feature" role="cell" data-label="Feature">
                {row.feature}
              </div>
              <div className="comparison-table-cell comparison-table-cell-ours" role="cell" data-label="InterviewAI">
                {row.ours ? <span className="comparison-table-check" aria-label="Included">✓</span> : "—"}
              </div>
              <div className="comparison-table-cell comparison-table-cell-others" role="cell" data-label="Others">
                {row.others}
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
