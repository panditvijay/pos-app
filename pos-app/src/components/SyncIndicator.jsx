import { useEffect, useState } from "react";

export default function SyncIndicator({ syncEngine }) {
  const [state, setState] = useState({
    state: "idle",
    lastSync: null,
    error: null,
  });

  useEffect(() => {
    if (!syncEngine) return;

    const handleStatus = (s) => setState((prev) => ({ ...prev, ...s }));
    syncEngine.on("status", handleStatus);
    syncEngine.on("push:job:start", () =>
      setState({ ...state, pushing: true })
    );
    syncEngine.on("push:job:done", () =>
      setState({ ...state, pushing: false })
    );

    return () => {};
  }, [syncEngine]);

  const manualSync = async () => {
    try {
      setState((s) => ({ ...s, state: "syncing" }));
      await syncEngine.syncNow();
    } catch (err) {
      setState((s) => ({ ...s, state: "error", error: String(err) }));
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div>
        Sync:{" "}
        {state.state === "offline" && (
          <span style={{ color: "gray" }}>Offline</span>
        )}
        {state.state === "syncing" && (
          <span style={{ color: "orange" }}>Syncing…</span>
        )}
        {state.state === "ok" && (
          <span style={{ color: "green" }}>Up-to-date</span>
        )}
        {state.state === "error" && <span style={{ color: "red" }}>Error</span>}
      </div>

      <button onClick={manualSync}>Sync Now</button>
      {state.lastSync && (
        <div style={{ fontSize: 12 }}>
          Last: {new Date(state.lastSync).toLocaleTimeString()}
        </div>
      )}
      {state.error && (
        <div style={{ color: "red", fontSize: 12 }}>{String(state.error)}</div>
      )}
    </div>
  );
}
