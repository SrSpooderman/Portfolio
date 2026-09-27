import React, { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme/ThemeProvider";
import { applyDocumentTheme } from "../theme/documentTheme";
import { contentCss } from "../renderer/styles";

import adapter from "./puckTheme.css?inline";
const canvasCss = contentCss + "\n" + adapter;
export function CanvasFrame({ children, document: frameDocument }) {
  const theme = useTheme();
  useLayoutEffect(() => {
    if (frameDocument) applyDocumentTheme(frameDocument, theme);
  }, [frameDocument, theme]);
  if (!frameDocument) return null;
  return (
    <>
      {createPortal(
        <style data-sp-canvas-styles>{canvasCss}</style>,
        frameDocument.head,
      )}
      {children}
    </>
  );
}
