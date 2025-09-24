import { useState, useEffect } from "react";

export default function MockServerPanel({ apiBaseUrl }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/server/orders`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setMessage("Failed to load server orders: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/server/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: 99, name: "Server Special", qty: 1, price: 9 }],
          total: 9,
        }),
      });
      const data = await res.json();
      setMessage("Server order created: " + data.record.uuid);
      fetchOrders();
    } catch (err) {
      setMessage("Failed to create order: " + err.message);
    }
  };

  const clearOrders = async () => {
    try {
      await fetch(`${apiBaseUrl}/server/clear`, { method: "POST" });
      setMessage("Server cleared");
      setOrders([]);
    } catch (err) {
      setMessage("Failed to clear server: " + err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, marginTop: 20 }}>
      <h3> Mock Server Panel</h3>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={fetchOrders}>Refresh Orders</button>
        <button onClick={createOrder}>Create Server Order</button>
        <button onClick={clearOrders}>Clear Server DB</button>
      </div>
      {loading && <p>Loading...</p>}
      {message && <p>{message}</p>}
      <div>
        <h4>Server Orders</h4>
        {orders.length === 0 && <p>No server orders</p>}
        {orders.map((o) => (
          <div
            key={o.serverId}
            style={{ marginBottom: 8, padding: 6, border: "1px solid #ddd" }}
          >
            <b>{o.uuid}</b> — ${o.total} — {o.status || "unknown"}
            <div style={{ fontSize: 12, color: "gray" }}>
              updatedAt: {new Date(o.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
