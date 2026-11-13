import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";

import "@/application.css";

const element = document.getElementById("root");

if (element) {
  createRoot(element).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
