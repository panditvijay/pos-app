import { sendToPrinter } from "../utils/printerUtils";

export class PrintJobManager {
  constructor(store) {
    this.store = store;
    this.queue = [];
    this.processing = false;
  }

  async enqueue(job) {
    const record = { ...job, status: "queued", createdAt: Date.now() };
    await this.store.queuePrintJob(record);
    this.queue.push(record);
    this.processNext();
  }

  async processNext() {
    if (this.processing || !this.queue.length) return;
    this.processing = true;

    const job = this.queue.shift();
    try {
      await sendToPrinter(job);
      job.status = "done";
      console.log("Print success:", job);
    } catch (err) {
      console.error("Print failed:", err);
      job.status = "failed";

      // Retry after delay
      setTimeout(() => {
        this.queue.push(job);
        this.processing = false;
        this.processNext();
      }, 2000);
      return;
    }

    this.processing = false;
    if (this.queue.length) this.processNext();
  }
}
