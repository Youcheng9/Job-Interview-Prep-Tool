import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: "96px" }}>
      <div className="shell-width" style={{ padding: "56px 0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "28px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span className="status-dot" />
              <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "22px" }}>
                Interview<span style={{ color: "var(--acid)" }}>Ace</span>
              </span>
            </div>
            <p className="muted" style={{ maxWidth: "32rem", fontSize: "15px" }}>
              Adversarial mock interview practice with role-based question banks, scoring, and answer feedback.
            </p>
            <div className="eyebrow" style={{ marginTop: "20px" }}>
              v2.0.0 // status: online
            </div>
          </div>

          <FooterColumn
            title="Routes"
            links={[
              { label: "Home", to: "/" },
              { label: "Practice", to: "/interview?role=swe&level=new_grad" },
              { label: "History", to: "/history" },
            ]}
          />
          <FooterColumn
            title="Tracks"
            links={[
              { label: "SWE", to: "/interview?role=swe&level=new_grad" },
              { label: "Data", to: "/interview?role=data&level=new_grad" },
              { label: "PM", to: "/interview?role=pm&level=new_grad" },
            ]}
          />
          <FooterColumn
            title="Access"
            links={[
              { label: "Sign In", to: "/auth" },
              { label: "Register", to: "/auth?mode=register" },
              { label: "Behavioral", to: "/interview?role=behavioral&level=new_grad" },
            ]}
          />
        </div>

        <div
          className="mono"
          style={{
            marginTop: "28px",
            paddingTop: "18px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted)",
          }}
        >
          <span>© 2026 interview ace ai</span>
          <span>designed after the reference repo shell language</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to: string }>;
}) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: "14px" }}>
        // {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {links.map((link) => (
          <Link key={link.to} to={link.to} style={{ textDecoration: "none", color: "var(--muted)", fontSize: "14px" }}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
