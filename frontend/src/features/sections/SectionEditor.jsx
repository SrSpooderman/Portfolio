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
    <div className="section-editor">
      <div className="editor-toolbar">
        <button
          onClick={() => {
            if (confirm("¿Salir? Los cambios sin guardar se perderán."))
              setEditing(null);
          }}
        >
          ← Secciones
        </button>
        <input
          aria-label="Nombre de la sección"
          placeholder="Nombre de la sección"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Volver al editor" : "Previsualizar sección"}
        </button>
        <button
          className="primary"
          disabled={busy}
          onClick={() => action(() => save())}
        >
          Guardar sección
        </button>
        <span role="status">{message}</span>
      </div>
      {preview ? (
        <div className="public">
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
