import { useEffect, useState } from "react";
import { offlineStore } from "../core/OfflineDataStore";

export default function OrderStatus() {
  const [orders, setOrders] = useState([]);

  const refresh = async () => {
    setOrders(await offlineStore.getOrders());
  };

  useEffect(() => {
    refresh();
    offlineStore.on("order:added", refresh);
    offlineStore.on("order:updated", refresh);
  }, []);

  const updateStatus = async (uuid, status) => {
    await offlineStore.updateOrder(uuid, { status });
  };

  return (
    <div>
      <h3>Orders</h3>
      {orders.map((o) => (
        <div key={o.uuid} style={{ margin: "8px 0" }}>
          <b>Order {o.uuid.slice(0, 6)}</b> – {o.status} – ${o.total}
          <div>
            {["pending", "preparing", "ready", "completed"].map((s) => (
              <button
                key={s}
                disabled={o.status === s}
                onClick={() => updateStatus(o.uuid, s)}
                style={{ margin: "10px" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
