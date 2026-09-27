import ui from "../../ui/primitives.module.css";
import contentStyles from "../../blocks/content.module.css";
import React from "react";

export function PortfolioFrame({ site, children }) {
  const year = new Date().getFullYear();
  return (
    <div className={contentStyles["public"]}>
      <header className={contentStyles["public-header"]}>
        <a href="/" className={ui["a"] + " " + ui["brand"]}>
          {site.name}
        </a>
        <nav>
          <a href="/#proyectos" className={ui["a"]}>
            Proyectos
          </a>
          <a href="/#sobre-mi" className={ui["a"]}>
            Sobre mí
          </a>
          <a
            className={ui["a"] + " " + contentStyles["nav-contact"]}
            href="/#contacto"
          >
            Contacto
          </a>
        </nav>
      </header>
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
