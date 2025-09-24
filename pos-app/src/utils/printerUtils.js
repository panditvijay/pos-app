export function formatReceipt(order) {
  return `
  *** Food Truck Receipt ***
  Order: ${(order?.uuid || "").slice(0, 6) || "—"}
  -----------------------------
  ${order.items
    .map((i) => `${i.name} x${i.qty} - $${i.price * i.qty}`)
    .join("\n")}
  -----------------------------
  Total: $${order.total}
  Status: ${order.status}
  *****************************
`;
}

export function sendToPrinter(job) {
  return new Promise((resolve, reject) => {
    console.log("🖨 Printing job:", job.type, job.content);

    Math.random() > 0.2 ? resolve() : reject("Printer error");
  });
}
