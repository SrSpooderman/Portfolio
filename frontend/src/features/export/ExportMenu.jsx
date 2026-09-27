import React, { useState } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { exportPayload, fileName, downloadFile } from "./exportDocument";
import styles from "./ExportMenu.module.css";
import ui from "../../ui/primitives.module.css";
export function ExportMenu({ data, name, kind }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(format) {
    setBusy(true);
    setError("");
    try {
      const payload = exportPayload({ data, name, kind, theme });
      if (format === "json")
        downloadFile(
          fileName(name, "json"),
          JSON.stringify(payload, null, 2),
          "application/json",
        );
      else {
        const { renderHtml } = await import("./renderHtml");
        downloadFile(
          fileName(name, "html"),
          renderHtml(payload, location.origin),
          "text/html",
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={styles.root}>
      <summary>Exportar {kind === "page" ? "página" : "sección"}</summary>
      <div className={styles.options}>
        <button
          type="button"
          className={ui.button}
          disabled={busy}
          onClick={() => run("json")}
        >
          JSON editable
        </button>
        <button
          type="button"
          className={ui.button}
          disabled={busy}
          onClick={() => run("html")}
        >
          HTML visible
        </button>
        <small className={ui.small}>
          El HTML incluye estilos. Las imágenes usan sus URLs originales.
        </small>
        {error && (
          <p className={ui.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
