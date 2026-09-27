import ui from "../../ui/primitives.module.css";
import assetFieldStyles from "./AssetField.module.css";
import React, { useEffect, useState } from "react";
import { safe } from "../../shared/urls";
export function AssetField({ value, onChange, name }) {
  const [assets, setAssets] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    fetch("/api/assets")
      .then(async (r) => {
        if (!r.ok) throw Error("No se pudo cargar la biblioteca");
        setAssets(await r.json());
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div className={assetFieldStyles["asset-field"]}>
      <label>
        URL de imagen
        <input
          aria-label={name || "URL de imagen"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={ui["input"]}
        />
      </label>
      {value && <img src={safe(value)} alt="Vista previa" />}
      <select
        aria-label="Seleccionar de la biblioteca"
        value={assets.some((a) => a.url === value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={ui["select"]}
      >
        <option value="">Seleccionar de la biblioteca…</option>
        {assets.map((a) => (
          <option key={a.id} value={a.url}>
            {a.filename}
          </option>
        ))}
      </select>
      <label>
        Subir imagen
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              const body = new FormData();
              body.append("file", file);
              const r = await fetch("/api/assets", {
                method: "POST",
                body,
              });
              if (!r.ok) throw Error("No se pudo subir (máximo 10 MB)");
              const a = await r.json();
              onChange(a.url);
              refresh();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
          className={ui["input"]}
        />
      </label>
      <button
        type="button"
        onClick={() => onChange("")}
        className={ui["button"]}
      >
        Quitar imagen
      </button>
      {error && (
        <p role="alert" className={ui["p"]}>
          {error}
        </p>
      )}
    </div>
  );
}
