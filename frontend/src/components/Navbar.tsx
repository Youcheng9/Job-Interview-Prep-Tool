import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken, isAuthenticated } from "../lib/api";
import { useTheme } from "./ThemeProvider";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: "/history", label: "Progress" },
  ];

  const scrollToPracticeSetup = () => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById("practice-setup");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handlePracticeClick = () => {
    if (authed) {
      navigate("/interview?role=swe&level=new_grad");
      return;
    }

    if (location.pathname === "/") {
      scrollToPracticeSetup();
      return;
    }

    navigate("/");
    window.setTimeout(scrollToPracticeSetup, 0);
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="shell-width"
        style={{
          minHeight: "88px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: "var(--font-body)",
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          <span>Interview<span style={{ color: "var(--acid)" }}>Ace</span></span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/"
              style={{
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                color: location.pathname === "/" ? "var(--acid)" : "var(--muted)",
                border: location.pathname === "/" ? "1px solid rgba(185, 255, 57, 0.35)" : "1px solid transparent",
                background: location.pathname === "/" ? "var(--acid-soft)" : "transparent",
                borderRadius: "6px",
                padding: "10px 14px",
              }}
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handlePracticeClick}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                color: location.pathname.startsWith("/interview") ? "var(--acid)" : "var(--muted)",
                border: location.pathname.startsWith("/interview") ? "1px solid rgba(185, 255, 57, 0.35)" : "1px solid transparent",
                background: location.pathname.startsWith("/interview") ? "var(--acid-soft)" : "transparent",
                borderRadius: "6px",
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Practice
            </button>
            {navItems.map((item) => {
              const active =
                location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration: "none",
                    fontFamily: "var(--font-body)",
                    fontSize: "16px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: active ? "var(--acid)" : "var(--muted)",
                    border: active ? "1px solid rgba(185, 255, 57, 0.35)" : "1px solid transparent",
                    background: active ? "var(--acid-soft)" : "transparent",
                    borderRadius: "6px",
                    padding: "10px 14px",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={toggleTheme}
            style={{ minHeight: "46px", padding: "0 14px" }}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          {authed ? (
            <button
              type="button"
              className="btn-primary"
              style={{ minHeight: "46px", padding: "0 14px" }}
              onClick={() => {
                clearToken();
                window.location.reload();
              }}
            >
              Sign Out
            </button>
          ) : (
            <Link to="/auth" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-primary" style={{ minHeight: "46px", padding: "0 14px" }}>
                Sign in
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
