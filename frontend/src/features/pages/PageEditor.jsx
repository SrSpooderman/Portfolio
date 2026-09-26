import React, { useEffect, useState } from "react";
import { VisualEditor } from "../../editor/VisualEditor";
import { Renderer } from "../../renderer/Renderer";
export function PageEditor({
  editing,
  preview,
  setPreview,
  setEditing,
  busy,
  action,
  save,
  message,
  draft,
  setDraft,
}) {
  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button
          onClick={() => {
            if (
              confirm("Salir del editor? Los cambios sin guardar se perderán.")
            ) {
              setEditing(null);
              setPreview(false);
            }
          }}
        >
          ← Páginas
        </button>
        <strong>{editing.title}</strong>
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Volver al editor" : "Previsualizar"}
        </button>
        <button disabled={busy} onClick={() => action(() => save())}>
          Guardar borrador
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={() => action(() => save(true))}
        >
          Publicar ↗
        </button>
        <span role="status">{message}</span>
      </div>
      {preview ? (
        <div className="public">
          <Renderer data={draft} />
        </div>
      ) : (
        <VisualEditor
          data={draft}
          onChange={setDraft}
          onPublish={(data) => action(() => save(false, data))}
          headerTitle={editing.title}
          dictionary={{ "header-publish": "Guardar borrador" }}
        />
      )}
    </div>
  );
}
