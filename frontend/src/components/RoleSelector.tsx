import { type Role } from "../lib/api";

interface Props {
  selected: Role | null;
  onChange: (role: Role) => void;
}

const ROLES: { id: Role; index: string; label: string; desc: string; loops: string }[] = [
  { id: "swe", index: "[01]", label: "Software Eng", desc: "Algorithms, system design, object modeling, tradeoffs.", loops: "412 loops" },
  { id: "data", index: "[02]", label: "DS / ML", desc: "Statistics, ML debugging, SQL, experiments, model reasoning.", loops: "286 loops" },
  { id: "pm", index: "[03]", label: "Product Mgmt", desc: "Execution, product sense, metrics, prioritization.", loops: "194 loops" },
  { id: "behavioral", index: "[04]", label: "Behavioral", desc: "STAR answers, conflict, leadership, ownership.", loops: "238 loops" },
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
              padding: "26px",
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
                fontSize: "32px",
                fontWeight: 700,
                lineHeight: 0.95,
                marginBottom: "12px",
                color: active ? "var(--acid)" : "var(--text)",
              }}
            >
              {role.label}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "28ch" }}>{role.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
