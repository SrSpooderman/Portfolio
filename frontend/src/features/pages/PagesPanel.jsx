import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { PageForm } from "./PageForm";
export function PagesPanel({
  pages,
  busy,
  action,
  refresh,
  setMessage,
  setEditing,
  setDraft,
}) {
  return (
    <>
      <PageForm
        busy={busy}
        onSave={(values) =>
          action(async () => {
            await api("/api/pages", "POST", values);
            await refresh();
            setMessage("Página creada");
          })
        }
      />
      {pages.map((p) => (
        <div className="page-card" key={p.id}>
          <div>
            <h3>{p.title}</h3>
            <small>
              /{p.slug === "home" ? "" : p.slug} ·{" "}
              {p.published ? "Publicada" : "Borrador"}
            </small>
          </div>
          <button
            onClick={() => {
              setEditing(p);
              setDraft(p.draft);
              setMessage("");
            }}
          >
            Editar diseño ↗
          </button>
          <button
            disabled={busy}
            onClick={() =>
              action(async () => {
                await api("/api/pages/" + p.id + "/publish", "POST");
                await refresh();
                setMessage("Página publicada");
              })
            }
          >
            Publicar borrador
          </button>
          {p.slug !== "home" && (
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("¿Eliminar esta página?"))
                  action(async () => {
                    await api("/api/pages/" + p.id, "DELETE");
                    await refresh();
                  });
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      ))}
    </>
  );
}
