// src/api/syncEngine.js
// SyncEngine: responsible for pushing local queue -> server and pulling server updates -> local DB.
// Assumes offlineStore (from OfflineDataStore) is available and exposes:
// - db: Dexie instance with tables: queue, orders, products, printJobs
// - resolveConflict(local, server): conflict resolver hook
// - emitChange(event, payload): to notify UI

import { offlineStore } from "../core/OfflineDataStore";

const LS_LAST_SYNC = "pos:lastSync";

export class SyncEngine {
  constructor({ apiBaseUrl, pollIntervalMs = 30000 } = {}) {
    this.apiBaseUrl = apiBaseUrl || "/api";
    this.pollIntervalMs = pollIntervalMs;
    this.isSyncing = false;
    this.isEnabled = true; // flip to disable automatic polling
    this._pollTimer = null;
    this.listeners = {}; // simple emitter for sync events
  }

  // --- Events ---
  on(evt, cb) {
    (this.listeners[evt] ||= []).push(cb);
  }
  emit(evt, payload) {
    (this.listeners[evt] || []).forEach((cb) => cb(payload));
  }

  // --- Last sync tracking ---
  getLastSync() {
    const v = localStorage.getItem(LS_LAST_SYNC);
    return v ? Number(v) : 0;
  }
  setLastSync(ts) {
    localStorage.setItem(LS_LAST_SYNC, String(ts));
  }

  // --- Public: start / stop poller ---
  startAutoSync() {
    if (this._pollTimer) return;
    this._pollTimer = setInterval(() => {
      if (navigator.onLine) this.syncNow().catch(() => {});
    }, this.pollIntervalMs);
  }
  stopAutoSync() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  // --- Main entry point: try to perform a full sync now ---
  async syncNow() {
    if (!navigator.onLine) {
      this.emit("status", { state: "offline" });
      return;
    }
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.emit("status", { state: "syncing" });

    try {
      // 1) Push local queue first (writes)
      await this._pushLocalQueue();

      // 2) Pull remote updates (partial sync using lastSync)
      await this._pullRemoteChanges();

      // 3) update last sync timestamp
      this.setLastSync(Date.now());
      this.emit("status", { state: "ok", lastSync: this.getLastSync() });
    } catch (err) {
      console.error("SyncEngine.syncNow error:", err);
      this.emit("status", { state: "error", error: String(err) });
      throw err;
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Push local queued writes to server ---
  async _pushLocalQueue() {
    const jobs = await offlineStore.db.queue.toArray();
    if (!jobs.length) {
      this.emit("push:empty");
      return;
    }

    // process sequentially, but could be parallelized if needed
    for (const job of jobs) {
      this.emit("push:job:start", job);
      try {
        await this._pushJobToServer(job);
        // remove job from queue on success
        await offlineStore.db.queue.delete(job.id);
        this.emit("push:job:done", job);
      } catch (err) {
        // increment retries and set a delay for next attempt (backoff)
        const retries = (job.retries || 0) + 1;
        await offlineStore.db.queue.update(job.id, {
          retries,
          lastError: String(err),
          lastAttemptAt: Date.now(),
        });

        // If retries exceed threshold, keep it but notify.
        if (retries >= 5) {
          console.warn("SyncEngine: Job max retries reached", job);
          this.emit("push:job:failed", { job, error: String(err) });
        } else {
          // throw to stop pushing further (so backoff can be applied by caller)
          // but instead of throwing, we continue; we might prefer to stop to avoid hammering
          // choose to continue to attempt other jobs, but backoff will be applied by future poll
          this.emit("push:job:retry", { job, retries });
        }
      }
    }
  }

  // logic to send a single queued job to server
  async _pushJobToServer(job) {
    // Map job.type into API endpoints
    // Example job.type: "order:add", "order:update", "print:add"
    const url = `${this.apiBaseUrl}/sync/push`;
    const body = {
      type: job.type,
      payload: job.payload,
      deviceId: this._getDeviceId(),
      retries: job.retries || 0,
      createdAt: job.createdAt,
    };

    // send with fetch; expect { ok: true, applied: {...} } or throw on 5xx
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Push failed ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    // If server returned authoritative updates to apply locally, apply them
    if (data.apply && data.apply.type === "order") {
      // e.g. server returns canonical order record
      const serverOrder = data.apply.record;
      await this._mergeServerOrder(serverOrder);
    }

    return data;
  }

  // --- Pull remote changes since lastSync ---
  async _pullRemoteChanges() {
    const since = this.getLastSync();
    const url = `${this.apiBaseUrl}/sync/changes?since=${since}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      throw new Error(`Pull failed ${resp.status}`);
    }

    const data = await resp.json();
    // expected shape: { orders: [...], products: [...], printJobs: [...], serverTime: 123456789 }
    const { orders = [], products = [], printJobs = [], serverTime } = data;

    // apply products (replace or upsert)
    if (products.length) {
      await offlineStore.db.transaction(
        "rw",
        offlineStore.db.products,
        async () => {
          for (const p of products) {
            await offlineStore.db.products.put(p);
            offlineStore.emitChange("products:updated", p);
          }
        }
      );
    }

    // apply print jobs (server-origin)
    if (printJobs.length) {
      await offlineStore.db.transaction(
        "rw",
        offlineStore.db.printJobs,
        async () => {
          for (const j of printJobs) {
            // upsert
            await offlineStore.db.printJobs.put(j);
            offlineStore.emitChange("print:queued", j);
          }
        }
      );
    }

    // merge orders with conflict resolution
    for (const serverOrder of orders) {
      await this._mergeServerOrder(serverOrder);
    }

    // return serverTime so caller can use it
    if (serverTime) this.setLastSync(serverTime);
  }

  // --- Merge server order into local DB with conflict resolution ---
  async _mergeServerOrder(serverOrder) {
    const local = await offlineStore.db.orders
      .where("uuid")
      .equals(serverOrder.uuid)
      .first();

    if (!local) {
      // new order from server: insert it
      await offlineStore.db.orders.add(serverOrder);
      offlineStore.emitChange("order:added", serverOrder);
      return;
    }

    // if both exist, use the offlineStore.resolveConflict hook
    const resolved = await offlineStore.resolveConflict(local, serverOrder);

    // If resolved record is the server record, put it
    if (
      resolved === serverOrder ||
      resolved.updatedAt <= serverOrder.updatedAt
    ) {
      await offlineStore.db.orders.put(serverOrder);
      offlineStore.emitChange("order:updated", serverOrder);
      return;
    }

    // If resolved is local (meaning local wins), we should push the local record back to server
    // Push as a queued job so it goes through normal push flow
    await offlineStore.queueWrite("order:update", resolved);
    // optionally emit event to notify that a local change needs to be pushed
    this.emit("push:queued", { type: "order:update", payload: resolved });
  }

  // --- small device id generator for auditing ---
  _getDeviceId() {
    let id = localStorage.getItem("pos:deviceId");
    if (!id) {
      id = `device-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("pos:deviceId", id);
    }
    return id;
  }
}
