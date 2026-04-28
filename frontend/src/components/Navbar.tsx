import { Link, useLocation } from "react-router-dom";
import { clearToken, isAuthenticated } from "../lib/api";
import { useTheme } from "./ThemeProvider";

export function Navbar() {
  const location = useLocation();
  const authed = isAuthenticated();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: "/", label: "[Home]" },
    { path: "/history", label: "[History]" },
  ];

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
          minHeight: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--font-body)",
            fontSize: "26px",
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
            {navItems.map((item) => {
              const active =
                item.path === "/"
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration: "none",
                    fontFamily: "var(--font-body)",
                    fontSize: "15px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: active ? "var(--acid)" : "var(--muted)",
                    border: active ? "1px solid rgba(185, 255, 57, 0.35)" : "1px solid transparent",
                    background: active ? "var(--acid-soft)" : "transparent",
                    borderRadius: "6px",
                    padding: "8px 10px",
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
            style={{ minHeight: "40px", padding: "0 12px" }}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {authed ? (
            <button
              type="button"
              className="btn-primary"
              style={{ minHeight: "40px", padding: "0 12px" }}
              onClick={() => {
                clearToken();
                window.location.reload();
              }}
            >
              Sign Out
            </button>
          ) : (
            <Link to="/auth" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-primary" style={{ minHeight: "40px", padding: "0 12px" }}>
                Init →
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
