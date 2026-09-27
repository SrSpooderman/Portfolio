import { ExportMenu } from "../export/ExportMenu";
import ui from "../../ui/primitives.module.css";
import editorStyles from "../../editor/Editor.module.css";
import React, { useEffect, useState } from "react";
import { VisualEditor } from "../../editor/VisualEditor";
import { Renderer } from "../../renderer/Renderer";
import { PortfolioFrame } from "../portfolio/PortfolioFrame";
import {
  clearLocalDraft,
  countBlocks,
  readLocalDraft,
  sameData,
  writeLocalDraft,
} from "./localDrafts";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Monitor,
  Pencil,
  Save,
  Send,
  Smartphone,
  Tablet,
} from "lucide-react";

const viewports = [
  ["desktop", "Escritorio", Monitor],
  ["tablet", "Tablet", Tablet],
  ["mobile", "Móvil", Smartphone],
];

const puckViewports = [
  { width: 1440, height: "auto", label: "Escritorio" },
  { width: 768, height: "auto", label: "Tablet" },
  { width: 390, height: "auto", label: "Móvil" },
];

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
  savedDraft,
  site,
}) {
  const [recovery, setRecovery] = useState(() => {
    const stored = readLocalDraft(editing.id);
    return stored && !sameData(stored.data, draft) ? stored : null;
  });
  const [showCompare, setShowCompare] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastSavePublish, setLastSavePublish] = useState(false);
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const dirty = !sameData(draft, savedDraft);
  const saveStatus = busy
    ? "Guardando"
    : dirty
      ? "Cambios sin guardar"
      : "Guardado";

  useEffect(() => {
    const stored = readLocalDraft(editing.id);
    setRecovery(stored && !sameData(stored.data, draft) ? stored : null);
    setShowCompare(false);
    setSaveFailed(false);
  }, [editing.id]);

  useEffect(() => {
    if (recovery) return;
    if (dirty) writeLocalDraft(editing.id, draft);
    else clearLocalDraft(editing.id);
  }, [dirty, draft, editing.id, recovery]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function runSave(publish = false, data = draft) {
    setSaveFailed(false);
    setLastSavePublish(publish);
    const ok = await action(() => save(publish, data));
    if (ok) clearLocalDraft(editing.id);
    setSaveFailed(!ok);
  }

  function closeEditor() {
    if (
      dirty &&
      !confirm(
        "Salir del editor? Los cambios se conservarán como borrador local.",
      )
    ) {
      return;
    }
    setEditing(null);
    setPreview(false);
  }

  async function openPreviewWindow() {
    const win = window.open("", "_blank");
    if (!win) return;
    const { renderHtml } = await import("../export/renderHtml");
    const html = renderHtml(
      {
        kind: "page",
        name: editing.title,
        theme: site.theme,
        site,
        data: draft,
      },
      location.origin,
    );
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  return (
    <div className={editorStyles["editor"]}>
      <div className={editorStyles["editor-toolbar"]}>
        <button onClick={closeEditor} className={ui["button"]}>
          <ArrowLeft size={16} />
          Páginas
        </button>
        <div className={editorStyles["editor-title"]}>
          <strong>{editing.title}</strong>
          <span
            className={
              editorStyles["status-badge"] +
              " " +
              editorStyles[dirty ? "status-dirty" : "status-saved"]
            }
          >
            {saveStatus}
          </span>
          <span className={editorStyles["status-badge"]}>
            {editing.published ? "Publicado" : "Borrador"}
          </span>
        </div>
        <div className={editorStyles["toolbar-group"]}>
          <button onClick={() => setPreview(!preview)} className={ui["button"]}>
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            {preview ? "Editar" : "Preview"}
          </button>
          <button onClick={openPreviewWindow} className={ui["button"]}>
            <ExternalLink size={16} />
            Abrir
          </button>
        </div>
        {preview && (
          <div className={editorStyles["toolbar-group"]}>
            {viewports.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={previewViewport === id}
                className={
                  ui["button"] +
                  " " +
                  (previewViewport === id ? editorStyles["active-tool"] : "")
                }
                onClick={() => setPreviewViewport(id)}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        )}
        <button
          disabled={busy || !dirty}
          onClick={() => runSave()}
          className={ui["button"]}
        >
          <Save size={16} />
          Guardar
        </button>
        <button
          className={ui["button"] + " " + ui["primary"]}
          disabled={busy}
          onClick={() => runSave(true)}
        >
          <Send size={16} />
          Publicar
        </button>
        <ExportMenu data={draft} name={editing.title} kind="page" />
        <span role="status">{message}</span>
        {saveFailed && (
          <button
            className={ui["button"]}
            onClick={() => runSave(lastSavePublish)}
          >
            Reintentar
          </button>
        )}
      </div>
      {recovery && (
        <div className={editorStyles["recovery-banner"]}>
          <div>
            <strong>Borrador local disponible</strong>
            <small>
              {new Date(recovery.updatedAt).toLocaleString()} ·{" "}
              {countBlocks(recovery.data)} bloques
            </small>
          </div>
          <button
            className={ui["button"]}
            onClick={() => {
              setDraft(recovery.data);
              setRecovery(null);
            }}
          >
            Restaurar
          </button>
          <button
            className={ui["button"]}
            onClick={() => setShowCompare(!showCompare)}
          >
            Comparar
          </button>
          <button
            className={ui["button"]}
            onClick={() => {
              clearLocalDraft(editing.id);
              setRecovery(null);
              setShowCompare(false);
            }}
          >
            Descartar
          </button>
          {showCompare && (
            <p className={ui["small"]}>
              Editor actual: {countBlocks(draft)} bloques. Borrador local:{" "}
              {countBlocks(recovery.data)} bloques.
            </p>
          )}
        </div>
      )}
      <div
        className={[
          editorStyles["editor-panel"],
          preview && editorStyles["editor-panel-hidden"],
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <VisualEditor
          data={draft}
          onChange={setDraft}
          onPublish={(data) => runSave(false, data)}
          headerTitle={editing.title}
          viewports={puckViewports}
          dictionary={{
            "header-publish": "Guardar borrador",
          }}
        />
      </div>
      <div
        className={[
          editorStyles["preview-panel"],
          !preview && editorStyles["editor-panel-hidden"],
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={editorStyles["preview-shell"]}
          data-viewport={previewViewport}
        >
          <PortfolioFrame site={site}>
            <Renderer data={draft} />
          </PortfolioFrame>
        </div>
      </div>
    </div>
  );
}
