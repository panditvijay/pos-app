import { useStore } from "../store/useStore";
import { offlineStore } from "../core/OfflineDataStore";
import { PrintJobManager } from "../core/PrintJobManager";
import { formatReceipt } from "../utils/printerUtils";

const printManager = new PrintJobManager(offlineStore);

export default function Cart() {
  const { cart, clearCart } = useStore();
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const checkout = async () => {
    const order = { items: cart, total };
    const id = await offlineStore.addOrder(order);

    // enqueue receipt print
    await printManager.enqueue({
      type: "receipt",
      content: formatReceipt(order),
    });

    clearCart();
    alert("Order placed & receipt queued ✅");
  };

  return (
    <div>
      <h3>Cart</h3>
      {cart.map((c, i) => (
        <div key={i}>
          {c.name} - ${c.price}
        </div>
      ))}
      <p>Total: ${total}</p>
      <button disabled={!cart.length} onClick={checkout}>
        Checkout
      </button>
    </div>
  );
}
