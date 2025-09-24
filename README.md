## POS System – Offline-First 

This is a simplified Point of Sale (POS) app that showcases:
	•	Offline-first order management using IndexedDB (Dexie).
	•	Background sync engine to push local changes → server and pull updates ← server.
	•	Mock server for testing multi-device synchronization.
	•	Print queue manager with retry & formatting (receipts, kitchen tickets).
	•	React UI with order entry, sync indicator, and mock server panel.

## Project Structure

/pos-app
  ├── src/
  │   ├── api/syncEngine.js        # SyncEngine – push/pull between client & server
  │   ├── core/OfflineDataStore.js # IndexedDB wrapper (orders, queue, products, printJobs)
  │   ├── print/PrintJobManager.js # Queue manager for print jobs
  │   ├── utils/printerTemplates.js# ESC/POS templates (receipt, kitchen, etc.)
  │   ├── utils/printerUtils.js    # Mock printer (WebUSB/WebBluetooth placeholder)
  │   ├── components/              # React UI (OrderEntry, SyncIndicator, PrintQueue, MockServerPanel)
  │   └── App.jsx
/mock-sync-server
  ├── server.js                    # Express mock server for /api/sync


## Features

  Offline Orders
Orders are saved in IndexedDB even when offline.
	•	Sync Engine
	•	Push local queue → server (/api/sync/push)
	•	Pull server changes → local (/api/sync/changes)
	•	Conflict resolution hook.
	•	Print Queue
	•	Jobs are queued (receipt, kitchen).
	•	Retry on failure with exponential backoff.
	•	Uses template builder for formatted ESC/POS output.
	•	Mock Server Panel (UI)
	•	Create server-only orders.
	•	Refresh / clear server state.
	•	Demo multi-device sync.

## Setup

    1. Start the Mock Server

    cd mock-sync-server
    npm install
    npm run dev
    # → http://localhost:4000/api   

    2. Start the POS App
    cd pos-app
    npm install
    npm run dev
    # → http://localhost:5173


## Demo Workflow

	1.	Open POS app in browser.
	2.	Go offline (DevTools → Network → Offline).
	3.	Create orders → they are queued locally.
	4.	Go online and hit Sync Now.
	•	Orders are pushed to server.
	•	Server orders pulled into local DB.
	5.	Add a server order in Mock Server Panel → sync to see it appear locally.
	6.	Checkout → receipt and kitchen ticket are enqueued in Print Queue.
	•	sendToPrinter randomly succeeds/fails (80% success).
	•	Failed jobs retry automatically.