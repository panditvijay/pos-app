import { useState } from "react";

export default function ProductList({ products, onAdd }) {
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h3>Products</h3>
      <input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {filtered.map((p) => (
          <button key={p.id} onClick={() => onAdd(p)}>
            {p.name} - ${p.price}
          </button>
        ))}
      </div>
    </div>
  );
}
