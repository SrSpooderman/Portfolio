const definitions = {
  linen: {
    name: "Lino",
    mode: "light",
    background: "#f8f6f0",
    surface: "#ede8dc",
    text: "#292820",
    muted: "#656052",
    border: "#c9c2b2",
    accent: "#465d38",
    onAccent: "#ffffff",
    hover: "#34482a",
  },
  glacier: {
    name: "Glaciar",
    mode: "light",
    background: "#f4f8fc",
    surface: "#e3edf7",
    text: "#182c42",
    muted: "#52667d",
    border: "#becddd",
    accent: "#2258ac",
    onAccent: "#ffffff",
    hover: "#194486",
  },
  graphite: {
    name: "Grafito",
    mode: "dark",
    background: "#17191d",
    surface: "#25282e",
    text: "#f0f1f3",
    muted: "#b0b6c0",
    border: "#454b56",
    accent: "#bbcda0",
    onAccent: "#17200f",
    hover: "#d0dfb9",
  },
  crimson: {
    name: "Rojo y negro",
    mode: "dark",
    background: "#0e0e11",
    surface: "#1d171b",
    text: "#faf3f4",
    muted: "#c4aeb4",
    border: "#503039",
    accent: "#c8203f",
    onAccent: "#ffffff",
    hover: "#a71631",
  },
};
// Every palette implements the same semantic contract. User block colours are separate.
export const tokenNames = Object.freeze([
  "background",
  "surface",
  "text",
  "muted",
  "border",
  "accent",
  "onAccent",
  "hover",
  "active",
  "neutralHover",
  "neutralActive",
  "selected",
  "selectionOverlay",
  "focus",
  "disabledBg",
  "disabledText",
  "error",
  "backdrop",
]);
function completePalette(p) {
  return Object.freeze({
    ...p,
    active: `color-mix(in srgb, ${p.hover} 80%, ${p.text})`,
    neutralHover: `color-mix(in srgb, ${p.accent} 16%, ${p.background})`,
    neutralActive: `color-mix(in srgb, ${p.accent} 25%, ${p.background})`,
    selected: `color-mix(in srgb, ${p.accent} 20%, ${p.background})`,
    selectionOverlay: `color-mix(in srgb, ${p.accent} 14%, transparent)`,
    focus:
      p.mode === "dark"
        ? `color-mix(in srgb, ${p.accent} 65%, ${p.text})`
        : p.accent,
    disabledBg: p.surface,
    disabledText: p.muted,
    error: p.mode === "dark" ? "#ff9da8" : "#a51d36",
    backdrop: "#00000099",
  });
}
export function validatePalette(p) {
  if (!p || !["light", "dark"].includes(p.mode) || !p.name)
    throw Error("Invalid palette metadata");
  for (const name of tokenNames) {
    // Catalog is authored code, never CSS supplied by the API.
    if (
      typeof p[name] !== "string" ||
      !p[name].trim() ||
      /[;{}<>]/.test(p[name])
    ) {
      throw Error(`Missing or invalid palette token: ${name}`);
    }
  }
  if (
    p.accent === p.hover ||
    p.hover === p.active ||
    p.background === p.neutralHover
  ) {
    throw Error("Interactive states must differ");
  }
  return p;
}
export const palettes = Object.freeze(
  Object.fromEntries(
    Object.entries(definitions).map(([id, p]) => [
      id,
      validatePalette(completePalette(p)),
    ]),
  ),
);
export const defaultTheme = "linen";
export const themeIds = Object.freeze(Object.keys(palettes));
export function resolveThemeId(id) {
  return typeof id === "string" && Object.hasOwn(palettes, id)
    ? id
    : defaultTheme;
}
export function resolveTheme(id) {
  return palettes[resolveThemeId(id)];
}
