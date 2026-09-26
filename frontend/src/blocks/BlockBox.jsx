import React, { useEffect, useState } from "react";
import { num } from "../shared/numbers";
function vars(p = {}) {
  const s = p.appearance || {},
    g = p.placement || {},
    m = p.mobile || {};
  return {
    background: s.background || undefined,
    color: s.color || undefined,
    padding: s.padding === undefined ? undefined : num(s.padding),
    margin: s.margin === undefined ? undefined : num(s.margin),
    borderRadius: num(s.radius),
    border: s.borderWidth
      ? `${num(s.borderWidth)}px solid ${s.borderColor || "currentColor"}`
      : undefined,
    maxWidth: s.maxWidth ? num(s.maxWidth) : undefined,
    minHeight: s.minHeight ? num(s.minHeight) : undefined,
    fontSize: s.fontSize ? num(s.fontSize) : undefined,
    fontFamily: s.fontFamily || undefined,
    textAlign: s.align || undefined,
    boxShadow: s.shadow || undefined,
    "--span": Math.min(12, Math.max(1, num(g.span, 1))),
    "--row-span": Math.min(12, Math.max(1, num(g.rowSpan, 1))),
    "--column": num(g.column) ? num(g.column) : "auto",
    "--row": num(g.row) ? num(g.row) : "auto",
    "--mobile-span": Math.min(12, Math.max(1, num(m.span, 1))),
    "--mobile-row-span": Math.max(1, num(m.rowSpan, 1)),
    "--mobile-column": num(m.column) ? num(m.column) : "auto",
    "--mobile-row": num(m.row) ? num(m.row) : "auto",
    "--mobile-padding":
      m.padding === undefined ? undefined : `${num(m.padding)}px`,
    "--mobile-font": m.fontSize ? `${num(m.fontSize)}px` : undefined,
  };
}
export function Box({ children, ...props }) {
  return (
    <div
      ref={props.puck?.dragRef}
      className={`builder-block ${props.mobile?.hidden ? "mobile-hidden" : ""} ${props.appearance?.color ? "custom-color" : ""} ${props.appearance?.fontSize ? "custom-font" : ""}`}
      style={vars(props)}
    >
      {children}
    </div>
  );
}
