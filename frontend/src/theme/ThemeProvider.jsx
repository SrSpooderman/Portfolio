import React, { createContext, useContext, useLayoutEffect } from "react";
import { defaultTheme, resolveThemeId } from "./palettes";
import { applyDocumentTheme } from "./documentTheme";

const ThemeContext = createContext(defaultTheme);
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ theme, children }) {
  const id = resolveThemeId(theme);
  useLayoutEffect(() => {
    applyDocumentTheme(document, id);
  }, [id]);
  return <ThemeContext.Provider value={id}>{children}</ThemeContext.Provider>;
}
