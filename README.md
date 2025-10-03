# POS System

## 1. Offline-First Architecture

### a. Data Synchronization Strategy

Design a data synchronization strategy for orders, inventory, and menu items:

- **Local-First Storage**: Use IndexedDB via Dexie.js to capture all orders, inventory, and menu updates immediately
- **Change Log**: Maintain an event log for offline operations
- **Sync Engine**: On reconnect, push queued writes to server with timestamps + device ID

### b. Conflict Resolution

How would you handle conflict resolution when multiple devices modify the same data offline?

- **Simple Fields**: Use last-write-wins with timestamps for simple fields (like stock counts)
- **Complex Entities**: For complex entities (like order updates), use operational transforms or merge policies
- **Example**: If two devices update the same order, keep the latest status change but preserve all added items

### c. Data Consistency Across Devices

Approach to ensuring data consistency:

- **Versioning**: Every write generates a version number (or vector clock)
- **Sync Logic**:
  - If local version < server version → update local
  - If local version > server version → push to server

## 2. Performance Constraints

### a. Hardware Constraints

The system runs on Android tablets with 2GB RAM and older ARM processors:

- No heavy libraries (prefer native APIs)
- Lazy-load non-critical screens

### b. JavaScript Bundle Optimization

How would you optimize JavaScript bundle size and runtime performance?

- Minimize bundle size using tree-shaking and code splitting
- Use lazy loading for non-critical screens
- Use native APIs when possible

### c. DOM Manipulation and Memory Management

Strategies for efficient DOM manipulation and memory management:

- Use virtual DOM
- Use event delegation
- Use lazy loading for non-critical screens

## 3. Multi-Device Coordination

### a. Real-time Order Status Updates

How would you implement real-time order status updates between kitchen display and cashier devices?

- **Primary**: Use WebSockets if network exists
- **Fallback**: Local peer-to-peer sync via WebRTC or LAN discovery
- **Offline**: Cache updates locally and propagate on reconnect

### b. Print Job Queuing System

Design a queuing system for print jobs when multiple devices share a thermal printer:

- **Queue Manager**: Implement PrintJobManager with a FIFO queue
- **Priorities**: Allow priorities (kitchen > bar > receipt)
- **Retry Logic**: Retry failed jobs with exponential backoff
- **Persistence**: Store jobs persistently in IndexedDB

### c. Device Discovery and Pairing

Approach to device discovery and pairing in a local network:

- **Discovery**: Use mDNS/Bonjour or WebRTC local network discovery
- **Presence**: Devices broadcast presence (with roles: cashier, kitchen, printer)
- **Security**: Pairing secured via PIN code or QR code exchange

## 4. Data Storage Strategy

### a. Storage Technology Comparison

Compare IndexedDB, WebSQL, and localStorage for your use case:

- **IndexedDB**: Best for structured data, indexing, large storage → **recommended**
- **WebSQL**: Deprecated
- **localStorage**: Simple key/value, no indexing, limited size → not suitable

### b. Efficient Local Querying

How would you implement efficient local querying for large product catalogs?

- **Indexing**: Use Dexie.js indexes on productId, category, and name
- **Query Performance**: Queries like `products.where('category').equals('Beverages')` are O(log n)
- **UI Optimization**: Paginate + virtualize UI for smooth rendering

### c. Data Pruning Strategy

Design a data pruning strategy to manage storage limitations:

- **Retention Policy**: Keep only last 30 days of orders locally
- **Archiving**: Archive older data to server
- **Storage Monitoring**: Use storage cap check → prune least-used items when near limit
- **Compression**: Compress large fields (e.g., JSON receipts) before storing

## POS System – Offline-First

This is a simplified Point of Sale (POS) app that showcases:

- Offline-first order management using IndexedDB (Dexie).
- Background sync engine to push local changes → server and pull updates ← server.
- Mock server for testing multi-device synchronization.
- Print queue manager with retry & formatting (receipts, kitchen tickets).
- React UI with order entry, sync indicator, and mock server panel.

## Project Structure

```
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
```

## Features

### Offline Orders

Orders are saved in IndexedDB even when offline.

### Sync Engine

- Push local queue → server (/api/sync/push)
- Pull server changes → local (/api/sync/changes)
- Conflict resolution hook.

### Print Queue

- Jobs are queued (receipt, kitchen).
- Retry on failure with exponential backoff.
- Uses template builder for formatted ESC/POS output.

### Mock Server Panel (UI)

- Create server-only orders.
- Refresh / clear server state.
- Demo multi-device sync.

## Setup

### 1. Start the Mock Server

```bash
cd mock-sync-server
npm install
npm run dev
# → http://localhost:4000/api
```

### 2. Start the POS App

```bash
cd pos-app
npm install
npm run dev
# → http://localhost:5173
```

## Demo Workflow

1. Open POS app in browser.
2. Go offline (DevTools → Network → Offline).
3. Create orders → they are queued locally.
4. Go online and hit Sync Now.
   - Orders are pushed to server.
   - Server orders pulled into local DB.
5. Add a server order in Mock Server Panel → sync to see it appear locally.
6. Checkout → receipt and kitchen ticket are enqueued in Print Queue.
   - sendToPrinter randomly succeeds/fails (80% success).
   - Failed jobs retry automatically.
