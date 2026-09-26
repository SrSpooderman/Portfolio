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
        document.title = s.title;
        document.querySelector('meta[name="description"]').content =
          s.description;
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="loading">
        No se puede conectar con el servidor. {error}
        <br />
        <button onClick={() => location.reload()}>Reintentar</button>
      </div>
    );
  if (!site) return <div className="loading">Preparando tu portfolio…</div>;
  return location.pathname.startsWith("/admin") ? (
    <Admin site={site} setSite={setSite} />
  ) : (
    <Public site={site} />
  );
}
