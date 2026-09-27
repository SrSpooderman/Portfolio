import ui from "../../ui/primitives.module.css";
import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Renderer } from "../../renderer/Renderer";
import { PortfolioFrame } from "./PortfolioFrame";
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
    <PortfolioFrame site={site}>
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
    </PortfolioFrame>
  );
}
