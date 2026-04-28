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
    desc: "Foundational prompt set for basics, communication, and coachable reasoning.",
  },
  {
    id: "new_grad",
    code: "L2",
    label: "New Grad",
    desc: "Higher bar for depth, ownership, and decision quality under pressure.",
  },
];

export function LevelSelector({ selected, onChange }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
      {LEVELS.map((level) => {
        const active = selected === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            className="panel"
            style={{
              padding: "22px 24px",
              textAlign: "left",
              cursor: "pointer",
              background: active ? "var(--surface2)" : "var(--surface)",
              borderColor: active ? "rgba(185, 255, 57, 0.35)" : "var(--border)",
              boxShadow: active ? "var(--shadow-acid)" : "none",
            }}
          >
            <div className="chip chip-acid" style={{ marginBottom: "14px" }}>
              {level.code}
            </div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>
              {level.label}
            </div>
            <p className="muted" style={{ fontSize: "14px" }}>
              {level.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
