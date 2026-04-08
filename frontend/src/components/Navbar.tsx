import { Link, useLocation } from "react-router-dom";
import { clearToken, isAuthenticated } from "../lib/api";
import { useTheme } from "./ThemeProvider";

export function Navbar() {
  const location = useLocation();
  const authed = isAuthenticated();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/interview", label: "Interview" },
    { path: "/history", label: "History" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        zIndex: 1000,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* Logo/Title */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            fontFamily: "var(--font-head)",
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "0.1em",
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "var(--cyan)",
              borderRadius: "50%",
              boxShadow: "0 0 8px var(--cyan-glow)",
            }}
          />
          INTERVIEW <span style={{ color: "var(--cyan)" }}>INTEL</span>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <button
            className="btn-ghost"
            onClick={toggleTheme}
            style={{
              fontSize: "13px",
              padding: "6px 16px",
            }}
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              style={{
                textDecoration: "none",
                fontFamily: "var(--font-head)",
                fontSize: "14px",
                fontWeight: "500",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: location.pathname === path ? "var(--cyan)" : "var(--muted)",
                transition: "color 0.2s",
                padding: "8px 12px",
                borderRadius: "4px",
                border: location.pathname === path ? "1px solid var(--cyan)" : "1px solid transparent",
              }}
            >
              {label}
            </Link>
          ))}

          {/* Auth Button */}
          {authed ? (
            <button
              className="btn-ghost"
              onClick={() => {
                clearToken();
                window.location.reload();
              }}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                marginLeft: "8px",
              }}
            >
              Sign Out
            </button>
          ) : (
            <Link to="/auth" style={{ textDecoration: "none" }}>
              <button
                className="btn-ghost"
                style={{
                  fontSize: "13px",
                  padding: "6px 16px",
                  marginLeft: "8px",
                }}
              >
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
