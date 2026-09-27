import ui from "../../ui/primitives.module.css";
import themePickerStyles from "./ThemePicker.module.css";
import React from "react";
import { palettes } from "../../theme/palettes";
const semanticSwatches = [
  ["background", "Fondo"],
  ["text", "Texto"],
  ["surface", "Superficie"],
  ["accent", "Acento"],
  ["border", "Borde"],
];
export function ThemePicker({
  value,
  preview,
  onPreview,
  onApply,
  onCancel,
  error,
}) {
  return (
    <fieldset className={themePickerStyles["theme-picker"]}>
      <legend>Paleta de colores</legend>
      <div className={themePickerStyles["theme-options"]}>
        {Object.entries(palettes).map(([id, t]) => (
          <label className={themePickerStyles["theme-option"]} key={id}>
            <input
              type="radio"
              name="theme-preview"
              value={id}
              checked={preview === id}
              onChange={() => onPreview(id)}
              className={ui["input"]}
            />
            <strong>{t.name}</strong>
            <small className={ui["small"]}>
              {t.mode === "dark" ? "Oscura" : "Clara"}
            </small>
            <span
              className={themePickerStyles["theme-sample"]}
              style={{
                background: t.background,
                color: t.text,
                borderColor: t.border,
              }}
            >
              <span
                style={{
                  background: t.surface,
                }}
              >
                Aa{" "}
                <span
                  style={{
                    background: t.accent,
                    color: t.onAccent,
                  }}
                >
                  Botón
                </span>
              </span>
              <span className={themePickerStyles["theme-swatches"]}>
                {semanticSwatches.map(([token, label]) => (
                  <span
                    className={themePickerStyles["semantic-swatch"]}
                    key={token}
                  >
                    <i
                      style={{
                        background: t[token],
                        borderColor: t.border,
                      }}
                    />
                    <span>{label}</span>
                  </span>
                ))}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className={themePickerStyles["theme-actions"]}>
        <button
          type="button"
          className={ui["button"] + " " + ui["primary"]}
          disabled={preview === value}
          onClick={onApply}
        >
          Aplicar
        </button>
        <button
          type="button"
          className={ui["button"]}
          disabled={preview === value}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className={ui["p"]}>
          Selecciona una paleta.
        </p>
      )}
    </fieldset>
  );
}
