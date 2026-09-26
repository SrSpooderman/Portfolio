import React, { useEffect, useState } from "react";
export function Dashboard({ pages, assets, setTab }) {
  return (
    <>
      <div className="stats">
        <div>
          <small>PÁGINAS</small>
          <strong>{pages.length}</strong>
        </div>
        <div>
          <small>PUBLICADAS</small>
          <strong>{pages.filter((p) => p.published).length}</strong>
        </div>
        <div>
          <small>IMÁGENES</small>
          <strong>{assets.length}</strong>
        </div>
      </div>
      <div className="welcome">
        <span className="eyebrow">DE LA IDEA A LA PANTALLA</span>
        <h2>
          Tu próxima gran idea
          <br />
          empieza aquí.
        </h2>
        <p>Edita tu portada y hazla tuya. Publica cuando estés listo.</p>
        <button className="primary" onClick={() => setTab("pages")}>
          Editar mi portfolio ↗
        </button>
        <span className="welcome-star">✳</span>
      </div>
      <h3>Actividad reciente</h3>
      {pages.map((p) => (
        <div className="page-row" key={p.id}>
          <strong>{p.title}</strong>
          <span>Modificada {new Date(p.updated_at).toLocaleString("es")}</span>
          <span>{p.published ? "Publicada" : "Borrador"}</span>
        </div>
      ))}
    </>
  );
}
