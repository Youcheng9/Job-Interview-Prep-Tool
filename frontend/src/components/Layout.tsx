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
  const showBreadcrumbs = location.pathname !== '/';

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      {showBreadcrumbs && <Breadcrumbs />}
      <main style={{ flex: 1, paddingTop: showBreadcrumbs ? "0" : "64px" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}