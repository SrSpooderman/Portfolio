import { resolveTheme, resolveThemeId, tokenNames } from "./palettes.js";

// Works for both the host and a Puck iframe. Never remounts the editor or mutates data.
export function applyDocumentTheme(doc, id) {
  const root = doc.documentElement;
  const palette = resolveTheme(id);
  root.dataset.spTheme = resolveThemeId(id);
  root.style.colorScheme = palette.mode;
  for (const name of tokenNames)
    root.style.setProperty(`--sp-${name}`, palette[name]);
}
