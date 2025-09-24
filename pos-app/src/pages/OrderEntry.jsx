import ProductList from "../components/ProductList";
import Cart from "../components/Cart";
import OrderStatus from "../components/OrderStatus";
import { useStore } from "../store/useStore";
import PrintQueue from "../components/PrintQueue";
const demoProducts = [
  { id: 1, name: "Burger", price: 5 },
  { id: 2, name: "Fries", price: 3 },
  { id: 3, name: "Soda", price: 2 },
  { id: 4, name: "Pizza", price: 8 },
];

export default function OrderEntry() {
  const addToCart = useStore((s) => s.addToCart);

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div style={{ flex: 1 }}>
        <ProductList products={demoProducts} onAdd={addToCart} />
        <Cart />
      </div>
      <div style={{ flex: 1 }}>
        <OrderStatus />
        <PrintQueue />
      </div>
    </div>
  );
}
