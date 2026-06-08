import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import FitTrack from "./FitTrack.jsx";

// ── window.storage shim ──────────────────────────────────────────────────────
// FitTrack expects the Claude artifact runtime's async key-value store.
// Back it with localStorage. get() returns { value } (or null), set(k, v) saves.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FitTrack />
  </StrictMode>
);
