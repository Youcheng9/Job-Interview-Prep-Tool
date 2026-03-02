import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getHistory, type AnswerRecord, type Role } from "../../lib/api";

const ROLE_COLORS: Record<Role, string> = {
  swe: "#0d9488",
  data: "#6366f1",
  pm: "#f59e0b",
  behavioral: "#ec4899",
};

function ScorePill({ value }: { value: number }) {
  const color =
    value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="mono"
      style={{
        fontSize: "18px",
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

function HistoryRow({ record, index }: { record: AnswerRecord; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const roleColor = ROLE_COLORS[record.question.role] ?? "var(--cyan)";
  const date = new Date(record.created_at);

  return (
    <div
      className="animate-fade-up"
      style={{
        animationDelay: `${index * 60}ms`,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "2px",
        marginBottom: "10px",
        transition: "border-color 0.2s",
        borderLeft: `2px solid ${roleColor}`,
      }}
    >
      {/* Row header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          alignItems: "center",
          gap: "16px",
          textAlign: "left",
          color: "var(--text)",
        }}
      >
        {/* Index */}
        <span
          className="mono"
          style={{ fontSize: "11px", color: "var(--muted)", width: "32px" }}
        >
          #{String(index + 1).padStart(3, "0")}
        </span>

        {/* Question */}
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "14px",
            letterSpacing: "0.02em",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {record.question.text}
        </span>

        {/* Role tag */}
        <span
          className="mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: roleColor,
            background: `${roleColor}15`,
            border: `1px solid ${roleColor}40`,
            padding: "2px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {record.question.role}
        </span>

        {/* Date */}
        <span
          className="mono"
          style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap" }}
        >
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {/* Score */}
        <ScorePill value={record.score.overall} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "20px",
          }}
        >
          {/* Dimension bars */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {[
              { label: "Tech Depth", val: record.score.technical_depth, c: "#0d9488" },
              { label: "Clarity", val: record.score.clarity, c: "#6366f1" },
              { label: "Complete", val: record.score.completeness, c: "#f59e0b" },
              { label: "Structure", val: record.score.structure, c: "#ec4899" },
            ].map(({ label, val, c }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-head)",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  {label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MiniBar value={val} color={c} />
                  <span className="mono" style={{ fontSize: "12px", color: c }}>{val}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Answer preview */}
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "14px 16px",
              fontSize: "13px",
              color: "var(--muted)",
              lineHeight: 1.7,
              maxHeight: "120px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {record.answer}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40px",
                background: "linear-gradient(transparent, var(--surface2))",
              }}
            />
          </div>

          {/* Feedback */}
          {record.score.feedback && (
            <div
              style={{
                marginTop: "12px",
                borderLeft: "2px solid var(--cyan)",
                paddingLeft: "14px",
                fontSize: "12px",
                color: "var(--muted)",
                lineHeight: 1.7,
              }}
            >
              {record.score.feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Role | "all">("all");

  useEffect(() => {
    getHistory()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? records : records.filter((r) => r.question.role === filter);

  const avgScore =
    records.length
      ? Math.round(records.reduce((s, r) => s + r.score.overall, 0) / records.length)
      : 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Top nav */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text)",
          }}
        >
          Session Log
        </span>
        <Link
          to="/interview?role=swe"
          style={{
            fontFamily: "var(--font-head)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--cyan)",
            textDecoration: "none",
          }}
        >
          New Session →
        </Link>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px 60px" }}>
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
                style={{ fontSize: "28px", color: "var(--cyan)", marginBottom: "6px" }}
              >
                {val}
                <span style={{ fontSize: "14px", color: "var(--muted)" }}>{unit}</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-head)",
                  fontSize: "9px",
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

        {/* Filter tabs */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            animationDelay: "200ms",
          }}
        >
          {(["all", "swe", "data", "pm", "behavioral"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className="mono"
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "5px 14px",
                border: `1px solid ${filter === r ? (r === "all" ? "var(--cyan)" : ROLE_COLORS[r as Role]) : "var(--border)"}`,
                background:
                  filter === r
                    ? r === "all"
                      ? "var(--cyan-glow)"
                      : `${ROLE_COLORS[r as Role]}15`
                    : "transparent",
                color:
                  filter === r
                    ? r === "all"
                      ? "var(--cyan)"
                      : ROLE_COLORS[r as Role]
                    : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Records */}
        {loading ? (
          <div
            className="mono"
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--muted)",
              fontSize: "12px",
              letterSpacing: "0.1em",
            }}
          >
            FETCHING SESSION DATA...
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
                fontSize: "12px",
                letterSpacing: "0.15em",
                color: "var(--muted)",
                marginBottom: "16px",
              }}
            >
              NO RECORDS FOUND
            </div>
            <Link to="/">
              <button className="btn-primary" style={{ fontSize: "12px" }}>
                Start First Session →
              </button>
            </Link>
          </div>
        ) : (
          filtered.map((r, i) => (
            <HistoryRow key={r.id} record={r} index={i} />
          ))
        )}
      </div>
    </div>
  );
}