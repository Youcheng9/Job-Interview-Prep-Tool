import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Breadcrumbs } from "./Breadcrumbs";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const showBreadcrumbs = location.pathname !== "/";

  return (
    <div className="site-shell">
      <Navbar />
      {showBreadcrumbs ? <Breadcrumbs /> : null}
      <main className="shell-main">{children}</main>
      <Footer />
    </div>
  );
}
