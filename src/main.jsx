import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("wurzel")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
