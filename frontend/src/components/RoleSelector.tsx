import { type Role } from "../lib/api";

interface Props {
  selected: Role | null;
  onChange: (role: Role) => void;
}

const ROLES: { id: Role; label: string; tag: string; desc: string; color: string }[] = [
  {
    id: "swe",
    label: "Software Engineering",
    tag: "SWE",
    desc: "Data structures, algorithms, system design, OOP",
    color: "#0d9488",
  },
  {
    id: "data",
    label: "Data Science",
    tag: "DS/ML",
    desc: "Statistics, ML theory, model evaluation, SQL",
    color: "#6366f1",
  },
  {
    id: "pm",
    label: "Product Management",
    tag: "PM",
    desc: "Product sense, metrics, prioritization, strategy",
    color: "#f59e0b",
  },
  {
    id: "behavioral",
    label: "Behavioral",
    tag: "BEH",
    desc: "STAR method, leadership, conflict, teamwork",
    color: "#ec4899",
  },
];

export function RoleSelector({ selected, onChange }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "20px",
      }}
    >
      {ROLES.map((role, i) => {
        const isActive = selected === role.id;
        return (
          <button
            key={role.id}
            onClick={() => onChange(role.id)}
            className="animate-fade-up"
            style={{
              animationDelay: `${i * 80}ms`,
              background: isActive
                ? `linear-gradient(135deg, ${role.color}18, ${role.color}08)`
                : "var(--surface)",
              border: `1px solid ${isActive ? role.color : "var(--border)"}`,
              borderRadius: "2px",
              padding: "26px",
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
              boxShadow: isActive ? `0 0 24px ${role.color}30` : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = role.color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${role.color}20`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }
            }}
          >
            {/* Corner bracket */}
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 10,
                height: 10,
                borderTop: `2px solid ${role.color}`,
                borderLeft: `2px solid ${role.color}`,
                opacity: isActive ? 1 : 0.4,
                transition: "opacity 0.2s",
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderBottom: `2px solid ${role.color}`,
                borderRight: `2px solid ${role.color}`,
                opacity: isActive ? 1 : 0.4,
                transition: "opacity 0.2s",
              }}
            />

            {/* Tag */}
            <span
              className="mono"
              style={{
                display: "inline-block",
                fontSize: "12px",
                letterSpacing: "0.12em",
                color: role.color,
                background: `${role.color}18`,
                border: `1px solid ${role.color}40`,
                padding: "4px 10px",
                marginBottom: "14px",
              }}
            >
              {role.tag}
            </span>

            <div
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "21px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isActive ? role.color : "var(--text)",
                marginBottom: "10px",
                transition: "color 0.2s",
              }}
            >
              {role.label}
            </div>
            <div style={{ fontSize: "15px", color: "var(--muted)", lineHeight: 1.65 }}>
              {role.desc}
            </div>

            {/* Active indicator */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
