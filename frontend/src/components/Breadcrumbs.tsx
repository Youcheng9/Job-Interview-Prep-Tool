import { Link, useLocation } from "react-router-dom";

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const breadcrumbNameMap: Record<string, string> = {
    'interview': 'Interview',
    'history': 'Session History',
    'auth': 'Authentication',
  };

  return (
    <nav
      style={{
        padding: "16px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "var(--muted)",
              fontSize: "14px",
              fontFamily: "var(--font-head)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Home
          </Link>
          {pathnames.map((pathname, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            const displayName = breadcrumbNameMap[pathname] || pathname;

            return (
              <div key={pathname} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px" }}>→</span>
                {isLast ? (
                  <span
                    style={{
                      color: "var(--cyan)",
                      fontSize: "14px",
                      fontFamily: "var(--font-head)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {displayName}
                  </span>
                ) : (
                  <Link
                    to={routeTo}
                    style={{
                      textDecoration: "none",
                      color: "var(--muted)",
                      fontSize: "14px",
                      fontFamily: "var(--font-head)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {displayName}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}