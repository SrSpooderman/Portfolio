import { ExportMenu } from "../export/ExportMenu";
import contentStyles from "../../blocks/content.module.css";
import ui from "../../ui/primitives.module.css";
import editorStyles from "../../editor/Editor.module.css";
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
    <div className={editorStyles["editor"]}>
      <div className={editorStyles["editor-toolbar"]}>
        <button
          onClick={() => {
            if (
              confirm("Salir del editor? Los cambios sin guardar se perderán.")
            ) {
              setEditing(null);
              setPreview(false);
            }
          }}
          className={ui["button"]}
        >
          ← Páginas
        </button>
        <strong>{editing.title}</strong>
        <button onClick={() => setPreview(!preview)} className={ui["button"]}>
          {preview ? "Volver al editor" : "Previsualizar"}
        </button>
        <button
          disabled={busy}
          onClick={() => action(() => save())}
          className={ui["button"]}
        >
          Guardar borrador
        </button>
        <button
          className={ui["button"] + " " + ui["primary"]}
          disabled={busy}
          onClick={() => action(() => save(true))}
        >
          Publicar ↗
        </button>
        <ExportMenu data={draft} name={editing.title} kind="page" />
        <span role="status">{message}</span>
      </div>
      {preview ? (
        <div className={contentStyles["public"]}>
          <Renderer data={draft} />
        </div>
      ) : (
        <VisualEditor
          data={draft}
          onChange={setDraft}
          onPublish={(data) => action(() => save(false, data))}
          headerTitle={editing.title}
          dictionary={{
            "header-publish": "Guardar borrador",
          }}
        />
      )}
    </div>
  );
}
