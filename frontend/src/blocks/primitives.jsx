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
      className="builder-grid"
      style={{
        display: "grid",
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
      className="builder-container"
      style={{
        display: "flex",
        flexDirection: direction,
        gap: num(gap),
        justifyContent: justify,
        alignItems: align,
        flexWrap: "wrap",
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
    <div className="image-placeholder">Selecciona una imagen</div>
  );
  return link ? <a href={safe(link)}>{image}</a> : image;
}
export function Heading({ text, level = "h2" }) {
  const Tag = ["h1", "h2", "h3", "h4"].includes(level) ? level : "h2";
  return <Tag className="builder-heading">{text}</Tag>;
}
export function Paragraph({ text }) {
  return <p className="builder-paragraph">{text}</p>;
}
export function Button({
  label,
  url,
  background = "#292f25",
  color = "#ffffff",
  radius = 30,
}) {
  return (
    <a
      className="builder-button"
      style={{ background, color, borderRadius: num(radius) }}
      href={safe(url)}
    >
      {label}
    </a>
  );
}
