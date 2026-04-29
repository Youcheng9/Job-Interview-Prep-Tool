import { type Role } from "../lib/api";

interface Props {
  selected: Role | null;
  onChange: (role: Role) => void;
}

const ROLES: { id: Role; index: string; label: string; desc: string; loops: string }[] = [
  { id: "swe", index: "Core", label: "Software Engineering", desc: "Algorithms, system design, implementation detail, and tradeoff discussions.", loops: "Design + coding" },
  { id: "data", index: "Analytics", label: "Data / ML", desc: "Statistics, SQL, experimentation, model debugging, and applied reasoning.", loops: "Model + analysis" },
  { id: "pm", index: "Product", label: "Product Management", desc: "Execution, product sense, prioritization, metrics, and stakeholder judgment.", loops: "Case + strategy" },
  { id: "behavioral", index: "Stories", label: "Behavioral", desc: "Ownership, conflict, leadership, collaboration, and structured storytelling.", loops: "STAR + follow-ups" },
];

export function RoleSelector({ selected, onChange }: Props) {
  return (
    <div
      className="responsive-card-grid"
      style={{
        background: "var(--border)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {ROLES.map((role) => {
        const active = selected === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            style={{
              padding: "clamp(20px, 1.8vw, 30px)",
              textAlign: "left",
              background: active ? "var(--surface2)" : "var(--surface)",
              border: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
              <span className="mono" style={{ fontSize: "11px", color: active ? "var(--acid)" : "var(--muted)", letterSpacing: "0.12em" }}>
                {role.index}
              </span>
              <span className="mono" style={{ fontSize: "11px", color: active ? "var(--acid)" : "var(--muted)", letterSpacing: "0.12em" }}>
                {role.loops}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "clamp(1.7rem, 1.3rem + 1vw, 2.2rem)",
                fontWeight: 700,
                lineHeight: 0.95,
                marginBottom: "12px",
                color: active ? "var(--acid)" : "var(--text)",
              }}
            >
              {role.label}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.98rem", maxWidth: "none" }}>{role.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
