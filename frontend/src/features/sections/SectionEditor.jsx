import { ExportMenu } from "../export/ExportMenu";
import contentStyles from "../../blocks/content.module.css";
import ui from "../../ui/primitives.module.css";
import editorStyles from "../../editor/Editor.module.css";
import React from "react";
import { VisualEditor } from "../../editor/VisualEditor";
import { Renderer } from "../../renderer/Renderer";
export function SectionEditor({
  setEditing,
  name,
  setName,
  preview,
  setPreview,
  busy,
  action,
  save,
  message,
  data,
  setData,
}) {
  return (
    <div className={editorStyles["section-editor"]}>
      <div className={editorStyles["editor-toolbar"]}>
        <button
          onClick={() => {
            if (confirm("¿Salir? Los cambios sin guardar se perderán."))
              setEditing(null);
          }}
          className={ui["button"]}
        >
          ← Secciones
        </button>
        <input
          aria-label="Nombre de la sección"
          placeholder="Nombre de la sección"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          className={ui["input"]}
        />
        <button onClick={() => setPreview(!preview)} className={ui["button"]}>
          {preview ? "Volver al editor" : "Previsualizar sección"}
        </button>
        <button
          className={ui["button"] + " " + ui["primary"]}
          disabled={busy}
          onClick={() => action(() => save())}
        >
          Guardar sección
        </button>
        <ExportMenu data={data} name={name} kind="section" />
        <span role="status">{message}</span>
      </div>
      {preview ? (
        <div className={contentStyles["public"]}>
          <Renderer data={data} />
        </div>
      ) : (
        <VisualEditor
          data={data}
          onChange={setData}
          onPublish={(value) => action(() => save(value))}
        />
      )}
    </div>
  );
}
