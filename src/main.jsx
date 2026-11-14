import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { installUnauthorizedFetch } from "./lib/auth";
import { applyStoredTheme } from "./lib/theme";
import "highlight.js/styles/github-dark.css";
import "./themes";
import "./index.css";

function start() {
  applyStoredTheme();
  installUnauthorizedFetch();
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

start();
