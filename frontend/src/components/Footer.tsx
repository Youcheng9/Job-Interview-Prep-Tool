import { Link } from "react-router-dom";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "32px 0",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "32px",
            marginBottom: "32px",
          }}
        >
          {/* Brand Section */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--cyan)",
                  borderRadius: "50%",
                  boxShadow: "0 0 6px var(--cyan-glow)",
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: "14px",
                  letterSpacing: "0.15em",
                  color: "var(--text)",
                  textTransform: "uppercase",
                }}
              >
                INTERVIEW INTEL v1.0
              </span>
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "var(--muted)",
                lineHeight: 1.6,
                marginBottom: "16px",
              }}
            >
              AI-powered interview preparation with multi-dimensional scoring and personalized feedback.
            </p>
            <button
              onClick={scrollToTop}
              className="btn-ghost"
              style={{
                fontSize: "12px",
                padding: "8px 16px",
              }}
            >
              ↑ Back to Top
            </button>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "16px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text)",
                marginBottom: "16px",
              }}
            >
              Quick Links
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link
                to="/"
                style={{
                  textDecoration: "none",
                  color: "var(--muted)",
                  fontSize: "14px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                Home
              </Link>
              <Link
                to="/interview?role=swe"
                style={{
                  textDecoration: "none",
                  color: "var(--muted)",
                  fontSize: "14px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                Start Interview
              </Link>
              <Link
                to="/history"
                style={{
                  textDecoration: "none",
                  color: "var(--muted)",
                  fontSize: "14px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
              >
                Session History
              </Link>
            </div>
          </div>

          {/* Interview Tracks */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "16px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text)",
                marginBottom: "16px",
              }}
            >
              Interview Tracks
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { name: "Software Engineering", role: "swe" },
                { name: "Data Science", role: "data" },
                { name: "Product Management", role: "pm" },
                { name: "Behavioral", role: "behavioral" },
              ].map(({ name, role }) => (
                <Link
                  key={role}
                  to={`/interview?role=${role}`}
                  style={{
                    textDecoration: "none",
                    color: "var(--muted)",
                    fontSize: "14px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            © 2024 Interview Intel. Built for software engineering excellence.
          </p>
          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
            <span>•</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}