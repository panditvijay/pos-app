import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { SyncEngine } from "./api/syncEngine";
import { offlineStore } from "./core/OfflineDataStore";
const syncEngine = new SyncEngine({
  apiBaseUrl: "http://localhost:4000/api",
  pollIntervalMs: 20000,
});

syncEngine.startAutoSync();
window.offlineStore = offlineStore;
window.syncEngine = syncEngine;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App syncEngine={syncEngine} />
  </StrictMode>
);
