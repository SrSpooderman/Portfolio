import ui from "../../ui/primitives.module.css";
import themePickerStyles from "./ThemePicker.module.css";
import React from "react";
import { palettes } from "../../theme/palettes";
export function ThemePicker({ register, error }) {
  return (
    <fieldset className={themePickerStyles["theme-picker"]}>
      <legend>Paleta de colores</legend>
      <p className={ui["p"]}>Portfolio y administración.</p>
      <div className={themePickerStyles["theme-options"]}>
        {Object.entries(palettes).map(([id, t]) => (
          <label className={themePickerStyles["theme-option"]} key={id}>
            <input
              type="radio"
              value={id}
              {...register("theme")}
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
                {[t.background, t.surface, t.text, t.muted, t.accent].map(
                  (color, i) => (
                    <i
                      key={i}
                      style={{
                        background: color,
                        borderColor: t.border,
                      }}
                    />
                  ),
                )}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className={ui["p"]}>
          Selecciona una paleta.
        </p>
      )}
    </fieldset>
  );
}
