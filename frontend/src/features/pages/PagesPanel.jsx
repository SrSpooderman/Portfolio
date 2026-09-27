import ui from "../../ui/primitives.module.css";
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
        <div className={ui["page-card"]} key={p.id}>
          <div>
            <h3 className={ui["h3"]}>{p.title}</h3>
            <small className={ui["small"]}>
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
            className={ui["button"]}
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
            className={ui["button"]}
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
              className={ui["button"]}
            >
              Eliminar
            </button>
          )}
        </div>
      ))}
    </>
  );
}
