import ui from "../../ui/primitives.module.css";
import contentStyles from "../../blocks/content.module.css";
import React from "react";

export function PortfolioFrame({ site, children }) {
  const year = new Date().getFullYear();
  return (
    <div className={contentStyles["public"]}>
      <main>{children}</main>
      <footer className={ui["footer"]}>
        <span>
          © {year} {site.name}
        </span>
        <a href="/admin" className={ui["a"]}>
          Administración
        </a>
      </footer>
    </div>
  );
}
