import React from "react";
import { createRoot } from "react-dom/client";
import "@puckeditor/core/puck.css";
import "./styles/index.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")).render(<App />);
