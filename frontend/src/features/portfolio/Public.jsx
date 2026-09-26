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
    <div className="public">
      <header className="public-header">
        <a href="/" className="brand">
          {site.name}
          <span>®</span>
        </a>
        <nav>
          <a href="/#proyectos">Proyectos</a>
          <a href="/#sobre-mi">Sobre mí</a>
          <a className="nav-contact" href="/#contacto">
            Hablemos ↗
          </a>
        </nav>
      </header>
      <main>
        {error ? (
          <div className="loading">
            <h1>{error}</h1>
            <a href="/">Volver al inicio</a>
          </div>
        ) : page ? (
          <Renderer data={page.content} />
        ) : (
          <div className="loading">Cargando…</div>
        )}
      </main>
      <footer>
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>Diseñado con intención.</span>
        <a href="/admin">Administración ↗</a>
      </footer>
    </div>
  );
}
