// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let serverOrders = [];
let nextServerId = 1;

const FAILURE_RATE = 0.0;

app.post("/api/sync/push", (req, res) => {
  if (Math.random() < FAILURE_RATE) {
    return res.status(500).json({ ok: false, error: "Simulated server error" });
  }

  const { type, payload, deviceId } = req.body;
  console.log("[PUSH] Received", { type, deviceId });

  if (type === "order:add") {
    const serverRecord = {
      ...payload,
      serverId: nextServerId++,
      updatedAt: Date.now(),
      originDevice: deviceId || null,
    };

    serverOrders.push(serverRecord);

    return res.json({
      ok: true,
      apply: { type: "order", record: serverRecord },
    });
  }

  if (type === "order:update") {
    const { uuid } = payload;
    const idx = serverOrders.findIndex((o) => o.uuid === uuid);
    if (idx >= 0) {
      serverOrders[idx] = {
        ...serverOrders[idx],
        ...payload,
        updatedAt: Date.now(),
      };
      return res.json({
        ok: true,
        apply: { type: "order", record: serverOrders[idx] },
      });
    } else {
      // not found: treat as new
      const serverRecord = {
        ...payload,
        serverId: nextServerId++,
        updatedAt: Date.now(),
      };
      serverOrders.push(serverRecord);
      return res.json({
        ok: true,
        apply: { type: "order", record: serverRecord },
      });
    }
  }

  res.json({ ok: true });
});

app.get("/api/sync/changes", (req, res) => {
  const since = Number(req.query.since || 0);
  const changed = serverOrders.filter((o) => (o.updatedAt || 0) > since);
  res.json({
    orders: changed,
    products: [],
    printJobs: [],
    serverTime: Date.now(),
  });
});

app.get("/api/server/orders", (req, res) => {
  res.json({ orders: serverOrders });
});

app.post("/api/server/orders", (req, res) => {
  const body = req.body || {};
  const serverRecord = {
    uuid: body.uuid || `server-uuid-${Date.now()}`,
    items: body.items || [{ id: 1, name: "Server Burger", qty: 1, price: 5 }],
    total: body.total || 5,
    serverId: nextServerId++,
    updatedAt: Date.now(),
  };
  serverOrders.push(serverRecord);
  res.json({ ok: true, record: serverRecord });
});

app.post("/api/server/clear", (req, res) => {
  serverOrders = [];
  nextServerId = 1;
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Mock sync server listening on http://localhost:${PORT}`)
);
