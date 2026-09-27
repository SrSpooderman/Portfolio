import { SectionLibraryProvider } from "./SectionLibraryContext";
import React, { useEffect, useState } from "react";
import { Puck } from "@puckeditor/core";
import { config } from "./config";
import { editorOverrides } from "./overrides";
export function VisualEditor(props) {
  return (
    <SectionLibraryProvider>
      <Puck
        config={config}
        overrides={editorOverrides}
        iframe={{ enabled: true, syncHostStyles: false }}
        {...props}
      />
    </SectionLibraryProvider>
  );
}
