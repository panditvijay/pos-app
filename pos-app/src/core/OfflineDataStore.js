import Dexie from "dexie";

// Simple event emitter
class Emitter {
  constructor() {
    this.events = {};
  }
  on(event, cb) {
    (this.events[event] ||= []).push(cb);
  }
  emit(event, payload) {
    (this.events[event] || []).forEach((cb) => cb(payload));
  }
}

export class OfflineDataStore {
  constructor() {
    this.db = new Dexie("POSDB");
    this.db.version(1).stores({
      products: "id,name,category,price",
      orders: "++id,uuid,status,createdAt,updatedAt",
      printJobs: "++id,type,status,createdAt",
      queue: "++id,type,payload,retries,createdAt",
    });

    this.emitter = new Emitter();
    this.retryInterval = 2000; // initial retry = 2s
    this.isOnline = navigator.onLine;

    window.addEventListener("online", () => this.flushQueue());
  }

  // --- Utility ---
  on(event, cb) {
    this.emitter.on(event, cb);
  }

  emitChange(event, payload) {
    this.emitter.emit(event, payload);
  }

  // --- Transactions with rollback ---
  async runTransaction(storeNames, fn) {
    return this.db.transaction("rw", storeNames, async () => {
      try {
        return await fn(this.db);
      } catch (err) {
        console.error("Transaction failed:", err);
        throw err;
      }
    });
  }

  // --- Orders ---
  async addOrder(order) {
    const record = {
      ...order,
      uuid: crypto.randomUUID(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const id = await this.db.orders.add(record);
    this.emitChange("order:added", record);

    if (!this.isOnline) {
      await this.queueWrite("order:add", record);
    }
    return id;
  }

  async updateOrder(uuid, updates) {
    const updatedAt = Date.now();
    await this.db.orders
      .where("uuid")
      .equals(uuid)
      .modify({ ...updates, updatedAt });
    this.emitChange("order:updated", { uuid, updates });

    if (!this.isOnline) {
      await this.queueWrite("order:update", { uuid, updates, updatedAt });
    }
  }

  async getOrders() {
    return this.db.orders.toArray();
  }

  // --- Print Jobs ---
  async queuePrintJob(job) {
    const record = { ...job, status: "queued", createdAt: Date.now() };
    const id = await this.db.printJobs.add(record);
    this.emitChange("print:queued", record);

    if (!this.isOnline) {
      await this.queueWrite("print:add", record);
    }
    return id;
  }

  // --- Queueing & Retry ---
  async queueWrite(type, payload) {
    await this.db.queue.add({
      type,
      payload,
      retries: 0,
      createdAt: Date.now(),
    });
  }

  async flushQueue() {
    const jobs = await this.db.queue.toArray();
    if (!jobs.length) return;

    for (const job of jobs) {
      try {
        console.log("Syncing job:", job);

        await this.db.queue.delete(job.id); // success
        this.emitChange("queue:flushed", job);
        this.retryInterval = 2000; // reset on success
      } catch (err) {
        console.error("Sync failed, will retry:", err);

        // exponential backoff
        const newRetries = job.retries + 1;
        await this.db.queue.update(job.id, { retries: newRetries });

        this.retryInterval = Math.min(this.retryInterval * 2, 60000); // cap at 1 min
        setTimeout(() => this.flushQueue(), this.retryInterval);
      }
    }
  }

  // --- Conflict Handling Hook ---
  async resolveConflict(localRecord, serverRecord) {
    // Default = last-write-wins
    return localRecord.updatedAt > serverRecord.updatedAt
      ? localRecord
      : serverRecord;
  }
}

export const offlineStore = new OfflineDataStore();
