import { type CandidateLevel } from "../lib/api";

interface Props {
  selected: CandidateLevel;
  onChange: (level: CandidateLevel) => void;
}

const LEVELS: Array<{
  id: CandidateLevel;
  label: string;
  tag: string;
  desc: string;
  accent: string;
}> = [
  {
    id: "intern",
    label: "Intern",
    tag: "Level 01",
    desc: "Foundational questions focused on basics, clear thinking, and coachable reasoning.",
    accent: "#22c55e",
  },
  {
    id: "new_grad",
    label: "New Grad",
    tag: "Level 02",
    desc: "Questions with more ownership, stronger tradeoffs, and deeper expected detail.",
    accent: "#0d9488",
  },
];

export function LevelSelector({ selected, onChange }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "18px",
      }}
    >
      {LEVELS.map((level) => {
        const isActive = selected === level.id;
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${level.accent}18, ${level.accent}08)`
                : "var(--surface)",
              border: `1px solid ${isActive ? level.accent : "var(--border)"}`,
              borderRadius: "2px",
              padding: "22px 24px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: isActive ? `0 0 22px ${level.accent}24` : "none",
              transition: "all 0.2s ease",
            }}
          >
            <div
              className="mono"
              style={{
                display: "inline-block",
                fontSize: "12px",
                letterSpacing: "0.12em",
                color: level.accent,
                background: `${level.accent}18`,
                border: `1px solid ${level.accent}40`,
                padding: "4px 10px",
                marginBottom: "14px",
              }}
            >
              {level.tag}
            </div>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "22px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: isActive ? level.accent : "var(--text)",
                marginBottom: "10px",
              }}
            >
              {level.label}
            </div>
            <div style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--muted)" }}>
              {level.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}
