import React from "react";
import styles from "./content.module.css";
import { resolveBlockStyle } from "./resolveBlockStyle";
export function Box({ children, ...props }) {
  return (
    <div
      ref={props.puck?.dragRef}
      id={props.anchor || undefined}
      data-block-id={props.id}
      data-custom-background={props.appearance?.background ? "true" : undefined}
      data-custom-padding={
        props.appearance?.padding !== undefined ? "true" : undefined
      }
      className={[
        styles["builder-block"],
        props.mobile?.hidden && styles["mobile-hidden"],
        props.appearance?.color && styles["custom-color"],
        props.appearance?.fontSize && styles["custom-font"],
      ]
        .filter(Boolean)
        .join(" ")}
      style={resolveBlockStyle(props)}
    >
      {children}
    </div>
  );
}
