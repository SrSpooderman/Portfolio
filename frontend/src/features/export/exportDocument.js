import { resolveThemeId } from "../../theme/palettes.js";

export function exportPayload({ data, name, kind, theme }) {
  if (!data || !Array.isArray(data.content)) throw Error("Documento no válido");
  if (!["page", "section"].includes(kind))
    throw Error("Tipo de documento no válido");
  return {
    format: "SpiderPortfolio",
    version: 1,
    kind,
    name,
    theme: resolveThemeId(theme),
    data: structuredClone(data),
  };
}
export function fileName(name, extension) {
  const base =
    (name || "portfolio")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "portfolio";
  return `${base}.${extension}`;
}
export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
