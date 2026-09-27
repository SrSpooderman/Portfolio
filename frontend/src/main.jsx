import { applyDocumentTheme } from "./theme/documentTheme";
import React from "react";
import { createRoot } from "react-dom/client";

import "./styles/index.css";
import { App } from "./app/App";

applyDocumentTheme(document, "linen");

createRoot(document.getElementById("root")).render(<App />);
