import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element not found");

createRoot(root).render(
  <StrictMode>
    <Theme accentColor="indigo">
      <App />
    </Theme>
  </StrictMode>,
);
