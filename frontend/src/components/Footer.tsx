import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell-width" style={{ padding: "56px 0 24px" }}>
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 0.7fr) minmax(0, 1.3fr)",
            gap: "clamp(32px, 5vw, 88px)",
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "2.16rem" }}>
                Interview<span style={{ color: "var(--acid)" }}>Ace</span>
              </span>
            </div>
            <p className="muted" style={{ maxWidth: "38rem", fontSize: "1.08rem" }}>
              Structured interview practice with role-based question banks, scoring, and session history
            </p>
          </div>

          <div className="footer-nav-grid">
            <FooterColumn
              title="Routes"
              align="start"
              links={[
                { label: "Home", to: "/" },
                { label: "Practice", to: "/interview?role=swe&level=new_grad" },
                { label: "History", to: "/history" },
              ]}
            />
            <FooterColumn
              title="Practice"
              columns={2}
              align="center"
              links={[
                { label: "SWE Intern", to: "/interview?role=swe&level=intern" },
                { label: "SWE New Grad", to: "/interview?role=swe&level=new_grad" },
                { label: "DSA Intern", to: "/interview?role=data&level=intern" },
                { label: "DSA New Grad", to: "/interview?role=data&level=new_grad" },
                { label: "PM Intern", to: "/interview?role=pm&level=intern" },
                { label: "PM New Grad", to: "/interview?role=pm&level=new_grad" },
                { label: "Behavioral Intern", to: "/interview?role=behavioral&level=intern" },
                { label: "Behavioral New Grad", to: "/interview?role=behavioral&level=new_grad" },
              ]}
            />
            <FooterColumn
              title="Account"
              align="end"
              inset
              links={[
                { label: "Sign In", to: "/auth" },
                { label: "Register", to: "/auth?mode=register" },
              ]}
            />
          </div>
        </div>

        <div
          className="footer-meta mono"
          style={{
            marginTop: "28px",
            paddingTop: "18px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "0.9rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--muted)",
          }}
        >
          <span>© 2026 InterviewAce</span>
          <span>Built for repeatable, high-signal interview practice</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  columns = 1,
  align = "stretch",
  inset = false,
}: {
  title: string;
  links: Array<{ label: string; to: string }>;
  columns?: 1 | 2;
  align?: "start" | "center" | "end" | "stretch";
  inset?: boolean;
}) {
  return (
    <div
      style={{
        justifySelf: align,
        marginRight: inset ? "clamp(18px, 3vw, 42px)" : undefined,
        width: columns === 2 ? "min(100%, 26rem)" : "auto",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: "14px", fontSize: "13.2px" }}>
        {title}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns === 2 ? "repeat(2, minmax(0, 1fr))" : "1fr",
          columnGap: "18px",
          rowGap: "10px",
        }}
      >
        {links.map((link) => (
          <Link key={link.to} to={link.to} style={{ textDecoration: "none", color: "var(--muted)", fontSize: "1.02rem" }}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
