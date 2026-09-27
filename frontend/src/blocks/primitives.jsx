import ui from "../ui/primitives.module.css";
import contentStyles from "./content.module.css";
import React, { useEffect, useState } from "react";
import { num } from "../shared/numbers";
import { safe } from "../shared/urls";
export function Grid({
  content: Content,
  columns = 3,
  mobileColumns = 1,
  gap = 24,
  rowHeight = 0,
  alignItems = "stretch",
}) {
  return (
    <Content
      className={contentStyles["builder-grid"]}
      style={{
        display: "grid",
        // Puck slots default to 100%; nested layouts must size to their content.
        height: "auto",
        "--columns": Math.max(1, Math.min(12, columns)),
        "--mobile-columns": Math.max(1, Math.min(6, mobileColumns)),
        gap: num(gap),
        gridAutoRows: rowHeight ? `minmax(${num(rowHeight)}px, auto)` : "auto",
        alignItems,
      }}
    />
  );
}
export function Container({
  content: Content,
  direction = "column",
  gap = 20,
  justify = "flex-start",
  align = "stretch",
}) {
  return (
    <Content
      className={contentStyles["builder-container"]}
      style={{
        display: "flex",
        // Keep the slot content-sized, including when it contains another slot.
        height: "auto",
        flexDirection: direction,
        gap: num(gap),
        justifyContent: justify,
        alignItems: align,
        // A vertical stack needs a definite available width before measuring
        // nested grids and wrapping text. Only horizontal layouts wrap.
        flexWrap: direction === "row" ? "wrap" : "nowrap",
      }}
    />
  );
}
export function Photo({ src, alt, fit = "cover", height = 300, link }) {
  const image = src ? (
    <img
      src={safe(src)}
      alt={alt || ""}
      style={{
        width: "100%",
        height: height ? num(height) : "auto",
        objectFit: fit,
        display: "block",
      }}
    />
  ) : (
    <div className={contentStyles["image-placeholder"]}>
      Selecciona una imagen
    </div>
  );
  return link ? (
    <a href={safe(link)} className={ui["a"]}>
      {image}
    </a>
  ) : (
    image
  );
}
export function Heading({ text, level = "h2" }) {
  const Tag = ["h1", "h2", "h3", "h4"].includes(level) ? level : "h2";
  return <Tag className={contentStyles["builder-heading"]}>{text}</Tag>;
}
export function Paragraph({ text }) {
  return (
    <p className={ui["p"] + " " + contentStyles["builder-paragraph"]}>{text}</p>
  );
}
export function Button({
  label,
  url,
  background = "",
  color = "",
  radius = 30,
}) {
  return (
    <a
      className={ui["a"] + " " + contentStyles["builder-button"]}
      style={{
        "--button-bg": background || undefined,
        "--button-color": color || undefined,
        "--button-hover": background
          ? `color-mix(in srgb, ${background} 85%, ${color || "currentColor"})`
          : undefined,
        "--button-active": background
          ? `color-mix(in srgb, ${background} 70%, ${color || "currentColor"})`
          : undefined,
        "--button-radius": `${num(radius)}px`,
      }}
      href={safe(url)}
    >
      {label}
    </a>
  );
}

export function Spacer({ height = 64 }) {
  return (
    <div
      aria-hidden="true"
      style={{ height: Math.min(400, Math.max(0, num(height))) }}
    />
  );
}
