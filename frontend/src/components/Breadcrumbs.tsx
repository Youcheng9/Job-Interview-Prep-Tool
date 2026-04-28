import { Link, useLocation } from "react-router-dom";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  const breadcrumbNameMap: Record<string, string> = {
    interview: "Practice",
    history: "History",
    auth: "Access",
  };

  return (
    <nav style={{ borderBottom: "1px solid var(--border)", background: "rgba(23, 25, 29, 0.92)" }}>
      <div
        className="shell-width mono"
        style={{
          minHeight: "48px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--muted)",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          root
        </Link>
        {pathnames.map((pathname, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const displayName = breadcrumbNameMap[pathname] || pathname;

          return (
            <span key={routeTo} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--acid)" }}>{">"}</span>
              {isLast ? (
                <span style={{ color: "var(--text)" }}>{displayName}</span>
              ) : (
                <Link to={routeTo} style={{ textDecoration: "none" }}>
                  {displayName}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
