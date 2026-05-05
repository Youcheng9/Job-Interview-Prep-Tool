import { type CandidateLevel } from "../lib/api";

interface Props {
  selected: CandidateLevel;
  onChange: (level: CandidateLevel) => void;
}

const LEVELS: Array<{
  id: CandidateLevel;
  code: string;
  label: string;
  desc: string;
}> = [
  {
    id: "intern",
    code: "L1",
    label: "Intern",
    desc: "Fundamentals-heavy interviews focused on technical clarity, core reasoning, and coachable thinking",
  },
  {
    id: "new_grad",
    code: "L2",
    label: "New Grad",
    desc: "A higher bar for ownership, decision quality, and depth under tighter follow-up pressure",
  },
];

export function LevelSelector({ selected, onChange }: Props) {
  return (
    <div className="level-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(12px, 1.5vw, 18px)" }}>
      {LEVELS.map((level) => {
        const active = selected === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            className="panel"
            style={{
              padding: "clamp(20px, 1.8vw, 28px)",
              textAlign: "left",
              cursor: "pointer",
              background: active ? "var(--surface2)" : "var(--surface)",
            }}
          >
            <div
              className="chip"
              style={{
                marginBottom: "14px",
                color: active ? "var(--acid)" : "var(--muted)",
              }}
            >
              {level.code}
            </div>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "clamp(1.6rem, 1.25rem + 0.8vw, 2rem)",
                fontWeight: 700,
                marginBottom: "8px",
                color: active ? "var(--acid)" : "var(--text)",
              }}
            >
              {level.label}
            </div>
            <p
              style={{
                fontSize: "0.98rem",
                color: active ? "var(--acid)" : "var(--muted)",
              }}
            >
              {level.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
