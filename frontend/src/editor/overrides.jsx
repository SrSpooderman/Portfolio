import React from "react";
import { ComponentLibrary } from "./ComponentLibrary";
import { CanvasFrame } from "./CanvasFrame";
import { SectionDrawer } from "./SectionDrawer";
export const editorOverrides = {
  header: () => <ComponentLibrary />,
  iframe: CanvasFrame,
  drawer: SectionDrawer,
};
