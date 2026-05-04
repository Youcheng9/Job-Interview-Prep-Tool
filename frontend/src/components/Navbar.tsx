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
    if (location.pathname === "/") {
      scrollToPracticeSetup();
      return;
    }

    navigate("/");
    window.setTimeout(scrollToPracticeSetup, 0);
  };

  return (
    <>
      <nav className="site-navbar">
        <div className="shell-width navbar-shell">
          <Link
            to="/"
            className="navbar-brand"
          >
            <span>Interview<span style={{ color: "var(--acid)" }}>Ace</span></span>
          </Link>

          <div className="navbar-controls">
            <div className="navbar-links">
              <Link
                to="/"
                className={`navbar-link ${location.pathname === "/" ? "navbar-link-active" : ""}`}
              >
                Home
              </Link>
              <button
                type="button"
                onClick={handlePracticeClick}
                className={`navbar-link ${location.pathname.startsWith("/interview") ? "navbar-link-active" : ""}`}
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
                    className={`navbar-link ${active ? "navbar-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {authed ? (
              <button
                type="button"
                className="btn-primary navbar-action-button"
                onClick={() => {
                  clearToken();
                  window.location.reload();
                }}
              >
                Sign Out
              </button>
            ) : (
              <Link to="/auth" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-primary navbar-action-button">
                  Sign in
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <button
        type="button"
        className="theme-toggle-button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="theme-toggle-icon" aria-hidden="true" />
      </button>
    </>
  );
}
