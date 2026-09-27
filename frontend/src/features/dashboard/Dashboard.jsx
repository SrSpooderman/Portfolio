import ui from "../../ui/primitives.module.css";
import dashboardStyles from "./Dashboard.module.css";
import React, { useEffect, useState } from "react";
export function Dashboard({ pages, assets, setTab }) {
  return (
    <>
      <div className={dashboardStyles["stats"]}>
        <div>
          <small className={ui["small"]}>PÁGINAS</small>
          <strong>{pages.length}</strong>
        </div>
        <div>
          <small className={ui["small"]}>PUBLICADAS</small>
          <strong>{pages.filter((p) => p.published).length}</strong>
        </div>
        <div>
          <small className={ui["small"]}>IMÁGENES</small>
          <strong>{assets.length}</strong>
        </div>
      </div>
      <div className={dashboardStyles["welcome"]}>
        <h2 className={ui.h2}>Portfolio</h2>
        <button
          className={ui["button"] + " " + ui["primary"]}
          onClick={() => setTab("pages")}
        >
          Editar páginas
        </button>
      </div>
      <h3 className={ui["h3"]}>Actividad reciente</h3>
      {pages.map((p) => (
        <div className={ui["page-row"]} key={p.id}>
          <strong>{p.title}</strong>
          <span>Modificada {new Date(p.updated_at).toLocaleString("es")}</span>
          <span>{p.published ? "Publicada" : "Borrador"}</span>
        </div>
      ))}
    </>
  );
}
