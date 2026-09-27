import ui from "../../ui/primitives.module.css";
import contentStyles from "../../blocks/content.module.css";
import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Renderer } from "../../renderer/Renderer";
export function Public({ site }) {
  const [page, setPage] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api(
      "/api/public/pages/" +
        (location.pathname.replace(/^\/|\/$/g, "") || "home"),
    )
      .then(setPage)
      .catch((e) => setError(e.message));
  }, []);
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
      <main>
        {error ? (
          <div className={ui["loading"]}>
            <h1 className={ui["h1"]}>{error}</h1>
            <a href="/" className={ui["a"]}>
              Volver al inicio
            </a>
          </div>
        ) : page ? (
          <Renderer data={page.content} />
        ) : (
          <div className={ui["loading"]}>Cargando…</div>
        )}
      </main>
      <footer className={ui["footer"]}>
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <a href="/admin" className={ui["a"]}>
          Administración
        </a>
      </footer>
    </div>
  );
}
