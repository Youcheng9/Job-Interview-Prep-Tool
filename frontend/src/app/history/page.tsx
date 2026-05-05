import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getHistory, isAuthenticated, type AnswerRecord, type Role } from "../../lib/api";
import { getSavedInterviewSession } from "../../lib/interviewSession";

const ROLE_COLORS: Record<Role, string> = {
  swe: "#0d9488",
  data: "#6366f1",
  pm: "#f59e0b",
  behavioral: "#ec4899",
};

const ROLE_ORDER: Role[] = ["swe", "data", "pm", "behavioral"];

const ROLE_LABELS: Record<Role, string> = {
  swe: "Software",
  data: "Data",
  pm: "Product",
  behavioral: "Behavioral",
};

type Difficulty = AnswerRecord["question"]["difficulty"];

const DIFFICULTY_OPTIONS: Array<Difficulty | "all"> = ["all", "easy", "medium", "hard"];

const DIFFICULTY_LABELS: Record<Difficulty | "all", string> = {
  all: "All levels",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const DATE_FILTER_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
] as const;
const PAGE_SIZE = 3;

function ScorePill({ value }: { value: number }) {
  const color =
    value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="mono"
      style={{
        fontSize: "24px",
        fontWeight: 700,
        color,
        textShadow: `0 0 8px ${color}60`,
      }}
    >
      {value}
    </span>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        height: "3px",
        width: "60px",
        background: "var(--border)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

function ScoreBreakdown({ record }: { record: AnswerRecord }) {
  return (
    <div className="progress-score-grid">
      {[
        { label: "Tech Depth", val: record.score.technical_depth, c: "#0d9488" },
        { label: "Clarity", val: record.score.clarity, c: "#6366f1" },
        { label: "Complete", val: record.score.completeness, c: "#f59e0b" },
        { label: "Structure", val: record.score.structure, c: "#ec4899" },
      ].map(({ label, val, c }) => (
        <div key={label} className="progress-score-metric">
          <div className="progress-section-label">{label}</div>
          <div className="progress-score-row">
            <MiniBar value={val} color={c} />
            <span className="mono" style={{ color: c }}>
              {val}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TextList({ items }: { items: string[] }) {
  if (!items.length) return <span className="muted">No details recorded.</span>;

  return (
    <ul className="progress-detail-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function HistoryQuestionItem({
  record,
  index,
  onOpen,
}: {
  record: AnswerRecord;
  index: number;
  onOpen: (record: AnswerRecord) => void;
}) {
  const roleColor = ROLE_COLORS[record.question.role] ?? "var(--cyan)";
  const date = new Date(record.created_at);

  return (
    <div
      className="progress-question-card animate-fade-up"
      style={{
        animationDelay: `${index * 60}ms`,
        borderLeft: `2px solid ${roleColor}`,
      }}
    >
      <button
        className="progress-question-toggle"
        type="button"
        onClick={() => onOpen(record)}
      >
        <span className="progress-question-copy">
          <span className="progress-question-meta mono">
            {ROLE_LABELS[record.question.role]} • {record.question.difficulty} •{" "}
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="progress-question-title">{record.question.text}</span>
          <span className="progress-question-answer-preview">{record.answer}</span>
        </span>
        <span className="progress-question-score">
          <ScorePill value={record.score.overall} />
          <span className="progress-expand-arrow" aria-hidden="true" />
        </span>
      </button>

      <button
        onClick={() => onOpen(record)}
        className="progress-question-expand-button"
        type="button"
      >
        <span>View answer and results</span>
        <span className="progress-expand-arrow" aria-hidden="true" />
      </button>
    </div>
  );
}

function HistoryResultModal({ record, onClose }: { record: AnswerRecord; onClose: () => void }) {
  const roleColor = ROLE_COLORS[record.question.role] ?? "var(--cyan)";
  const date = new Date(record.created_at);
  const aiFeedback = record.score.ai_feedback;
  const instantFeedback = record.score.instant_feedback;
  const evaluationSummary = aiFeedback?.summary || instantFeedback?.summary || record.score.feedback || "No evaluation recorded.";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="progress-result-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="progress-result-modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-result-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="progress-result-modal-header" style={{ borderTopColor: roleColor }}>
          <div>
            <div className="progress-question-meta mono">
              {ROLE_LABELS[record.question.role]} • {record.question.difficulty} •{" "}
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <h2 id="progress-result-modal-title" className="progress-result-modal-title">
              {record.question.text}
            </h2>
          </div>
          <div className="progress-result-modal-score">
            <ScorePill value={record.score.overall} />
            <button type="button" className="progress-result-modal-close" onClick={onClose} aria-label="Close result">
              Close
            </button>
          </div>
        </div>

        <div className="progress-result-modal-body">
          <div className="progress-detail-scroll">
            <div className="progress-detail-section">
              <div className="progress-section-label">Your Answer</div>
              <p className="progress-answer-text progress-answer-text-strong">{record.answer}</p>
            </div>

            <div className="progress-detail-section">
              <div className="progress-section-label">Scoring</div>
              <ScoreBreakdown record={record} />
            </div>

            <div className="progress-detail-section">
              <div className="progress-section-label">Evaluation</div>
              <p className="progress-answer-text">{evaluationSummary}</p>
              <div className="progress-evaluation-grid">
                <div>
                  <div className="progress-section-label">Strengths</div>
                  <TextList items={aiFeedback?.strengths?.length ? aiFeedback.strengths : record.score.strengths} />
                </div>
                <div>
                  <div className="progress-section-label">Weaknesses</div>
                  <TextList items={aiFeedback?.weaknesses?.length ? aiFeedback.weaknesses : record.score.weaknesses} />
                </div>
              </div>
            </div>

            <div className="progress-detail-section">
              <div className="progress-section-label">Feedback</div>
              <p className="progress-answer-text">
                {aiFeedback?.next_focus || instantFeedback?.next_focus || record.score.feedback || "No feedback recorded."}
              </p>
              {(aiFeedback?.improvements?.length || instantFeedback?.improvements?.length) ? (
                <TextList items={aiFeedback?.improvements?.length ? aiFeedback.improvements : instantFeedback?.improvements ?? []} />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(ROLE_ORDER);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTER_OPTIONS)[number]["id"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AnswerRecord | null>(null);
  const [rolePages, setRolePages] = useState<Record<Role, number>>({
    swe: 1,
    data: 1,
    pm: 1,
    behavioral: 1,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/auth?next=%2Fhistory", { replace: true });
      return;
    }

    getHistory()
      .then(setRecords)
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load history.";
        const normalizedMessage = message.toLowerCase();
        if (
          normalizedMessage.includes("not authenticated") ||
          normalizedMessage.includes("could not validate credentials")
        ) {
          clearToken();
          navigate("/auth?next=%2Fhistory", { replace: true });
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const toggleRole = (role: Role) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : ROLE_ORDER.filter((item) => current.includes(item) || item === role),
    );
  };

  useEffect(() => {
    setRolePages({
      swe: 1,
      data: 1,
      pm: 1,
      behavioral: 1,
    });
  }, [dateFilter, difficultyFilter, selectedRoles]);

  const now = Date.now();

  const filtered = records.filter((record) => {
    const roleMatches = selectedRoles.includes(record.question.role);
    const difficultyMatches =
      difficultyFilter === "all" || record.question.difficulty === difficultyFilter;
    const createdAt = new Date(record.created_at).getTime();
    const dateMatches =
      dateFilter === "all"
        ? true
        : dateFilter === "7d"
          ? createdAt >= now - 7 * 24 * 60 * 60 * 1000
          : dateFilter === "30d"
            ? createdAt >= now - 30 * 24 * 60 * 60 * 1000
            : createdAt >= now - 90 * 24 * 60 * 60 * 1000;

    return roleMatches && difficultyMatches && dateMatches;
  });

  const visibleRoles = ROLE_ORDER.filter((role) => selectedRoles.includes(role));
  const recordsByRole = visibleRoles.map((role) => ({
    role,
    records: filtered.filter((record) => record.question.role === role),
  }));

  const avgScore =
    records.length
      ? Math.round(records.reduce((s, r) => s + r.score.overall, 0) / records.length)
      : 0;
  const previousWork = isAuthenticated() ? getSavedInterviewSession() : null;

  return (
    <div className="progress-page">
      <div className="progress-content">
        {previousWork ? (
          <div
            className="panel animate-fade-up"
            style={{
              padding: "20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>
                Resume
              </div>
              <div style={{ color: "var(--muted)", fontSize: "1rem" }}>
                Continue from your last saved interview question
              </div>
            </div>
            <button type="button" className="btn-resume" onClick={() => navigate(previousWork.href)}>
              Resume work
            </button>
          </div>
        ) : null}

        {/* Stats summary */}
        <div
          className="animate-fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {[
            { label: "Sessions Logged", val: records.length, unit: "" },
            { label: "Average Score", val: avgScore, unit: "/100" },
            {
              label: "Above Target",
              val: records.filter((r) => r.score.overall >= 75).length,
              unit: "",
            },
          ].map(({ label, val, unit }, i) => (
            <div
              key={label}
              className="panel"
              style={{
                padding: "20px",
                animationDelay: `${i * 80}ms`,
                textAlign: "center",
              }}
            >
              <div
                className="mono"
                style={{ fontSize: "34px", color: "var(--cyan)", marginBottom: "6px" }}
              >
                {val}
                <span style={{ fontSize: "16px", color: "var(--muted)" }}>{unit}</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="progress-filter-panel panel animate-fade-up">
          <div className="progress-filter-section">
            <div className="progress-filter-group">
              <label className="progress-filter-label" htmlFor="date-filter">
                Date range
              </label>
              <select
                id="date-filter"
                className="input-shell progress-filter-select"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as (typeof DATE_FILTER_OPTIONS)[number]["id"])}
              >
                {DATE_FILTER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="progress-filter-group">
              <label className="progress-filter-label" htmlFor="difficulty-filter">
                Difficulty
              </label>
              <select
                id="difficulty-filter"
                className="input-shell progress-filter-select"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value as Difficulty | "all")}
              >
                {DIFFICULTY_OPTIONS.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {DIFFICULTY_LABELS[difficulty]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="progress-filter-group">
            <legend className="progress-filter-label">Tracks</legend>
            <div className="progress-role-filter-grid">
              {ROLE_ORDER.map((role) => (
                <label
                  key={role}
                  className="progress-role-filter"
                  style={{
                    borderColor: selectedRoles.includes(role)
                      ? `${ROLE_COLORS[role]}80`
                      : "var(--border)",
                    color: selectedRoles.includes(role) ? ROLE_COLORS[role] : "var(--muted)",
                    background: selectedRoles.includes(role)
                      ? `${ROLE_COLORS[role]}15`
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span>{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Records */}
        {loading ? (
          <div
            className="mono"
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--muted)",
              fontSize: "14px",
              letterSpacing: "0.1em",
            }}
          >
            FETCHING SESSION DATA...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: "14px",
                letterSpacing: "0.15em",
                color: "#fca5a5",
                marginBottom: "14px",
              }}
            >
              HISTORY UNAVAILABLE
            </div>
            <div style={{ color: "var(--muted)", marginBottom: "16px" }}>{error}</div>
            <Link to="/auth?next=%2Fhistory" style={{ textDecoration: "none" }}>
              <button className="btn-primary" style={{ fontSize: "15px" }}>
                Reauthenticate
              </button>
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              border: "1px dashed var(--border)",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: "14px",
                letterSpacing: "0.15em",
                color: "var(--muted)",
                marginBottom: "16px",
              }}
            >
              NO RECORDS FOUND
            </div>
            <Link to="/">
              <button className="btn-primary" style={{ fontSize: "15px" }}>
                Start First Session
              </button>
            </Link>
          </div>
        ) : (
          <div className="progress-role-grid">
            {recordsByRole.map(({ role, records: roleRecords }) => (
              (() => {
                const totalPages = Math.max(1, Math.ceil(roleRecords.length / PAGE_SIZE));
                const currentPage = Math.min(rolePages[role] ?? 1, totalPages);
                const start = (currentPage - 1) * PAGE_SIZE;
                const visibleRecords = roleRecords.slice(start, start + PAGE_SIZE);

                return (
                  <section key={role} className="progress-role-column panel">
                    <div
                      className="progress-role-column-header"
                      style={{ borderBottomColor: `${ROLE_COLORS[role]}55` }}
                    >
                      <div>
                        <div className="eyebrow" style={{ color: ROLE_COLORS[role] }}>
                          {ROLE_LABELS[role]}
                        </div>
                        <h2 className="progress-role-title">{roleRecords.length} answers</h2>
                      </div>
                      <span
                        className="progress-role-dot"
                        style={{ background: ROLE_COLORS[role] }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="progress-role-question-list">
                      {roleRecords.length ? (
                        <>
                          {visibleRecords.map((record, index) => (
                            <HistoryQuestionItem
                              key={record.id}
                              record={record}
                              index={index}
                              onOpen={setSelectedRecord}
                            />
                          ))}
                          {totalPages > 1 ? (
                            <div className="progress-pagination">
                              <button
                                type="button"
                                className="progress-pagination-button"
                                onClick={() =>
                                  setRolePages((current) => ({
                                    ...current,
                                    [role]: Math.max(1, currentPage - 1),
                                  }))
                                }
                                disabled={currentPage === 1}
                              >
                                Previous
                              </button>
                              <span className="progress-pagination-meta mono">
                                Page {currentPage} / {totalPages}
                              </span>
                              <button
                                type="button"
                                className="progress-pagination-button"
                                onClick={() =>
                                  setRolePages((current) => ({
                                    ...current,
                                    [role]: Math.min(totalPages, currentPage + 1),
                                  }))
                                }
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="progress-column-empty">No matching answers.</div>
                      )}
                    </div>
                  </section>
                );
              })()
            ))}
          </div>
        )}
      </div>
      {selectedRecord ? (
        <HistoryResultModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      ) : null}
    </div>
  );
}
