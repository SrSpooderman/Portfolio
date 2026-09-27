import ui from "../ui/primitives.module.css";
import { ThemeProvider } from "../theme/ThemeProvider";
import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Admin } from "../features/admin/Admin";
import { Public } from "../features/portfolio/Public";
export function App() {
  const [site, setSite] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/public/site")
      .then((s) => {
        setSite(s);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    document.title = location.pathname.startsWith("/admin")
      ? "SpiderPortfolio"
      : site?.title || site?.name || "SpiderPortfolio";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = site?.description || "";
  }, [site]);
  if (error)
    return (
      <div className={ui["loading"]}>
        No se puede conectar con el servidor. {error}
        <br />
        <button onClick={() => location.reload()} className={ui["button"]}>
          Reintentar
        </button>
      </div>
    );
  if (!site) return <div className={ui["loading"]}>Cargando…</div>;
  return (
    <ThemeProvider theme={site.theme}>
      {location.pathname.startsWith("/admin") ? (
        <Admin site={site} setSite={setSite} />
      ) : site.setup_required ? (
        <main className={ui.loading}>
          <h1 className={ui.h1}>SpiderPortfolio</h1>
          <p className={ui.p}>Configuración pendiente.</p>
          <a className={ui.a} href="/admin">
            Configurar portfolio
          </a>
        </main>
      ) : (
        <Public site={site} />
      )}
    </ThemeProvider>
  );
}
