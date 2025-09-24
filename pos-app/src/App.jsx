import React from "react";
import OrderEntry from "./pages/OrderEntry";
import SyncIndicator from "./components/SyncIndicator";
import MockServerPanel from "./components/MockServerPanel";

export default function App({ syncEngine }) {
  return (
    <div style={{ flex: 1, padding: "10px" }}>
      <SyncIndicator syncEngine={syncEngine} />
      <OrderEntry />
      <MockServerPanel apiBaseUrl="http://localhost:4000/api" />
    </div>
  );
}
