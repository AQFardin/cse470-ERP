import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001/api/inventory";

type Warehouse = {
  id: string;
  name: string;
  location: string;
  capacity: number;
};

export default function WarehouseView() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadWarehouses() {
    const response = await fetch(`${API_BASE}/warehouses`);
    if (!response.ok) throw new Error("Failed to fetch warehouses");

    const data = await response.json();
    setWarehouses(data);
    setLoading(false);
  }

  useEffect(() => {
    loadWarehouses().catch(() => setLoading(false));
  }, []);

  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !location || !capacity) return;

    const response = await fetch(`${API_BASE}/warehouses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        location,
        capacity: Number(capacity),
      }),
    });

    if (!response.ok) {
      alert("Failed to create warehouse");
      return;
    }

    setName("");
    setLocation("");
    setCapacity("");

    await loadWarehouses();
  }

  async function deleteWarehouse(id: string) {
    if (!confirm("Delete this warehouse?")) return;

    const response = await fetch(`${API_BASE}/warehouses/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Failed to delete warehouse");
      return;
    }

    await loadWarehouses();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Warehouses</h1>

      <form
        onSubmit={createWarehouse}
        className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Warehouse name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          className="border rounded-lg px-3 py-2"
          type="number"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />

        <button
          type="submit"
          className="rounded-lg px-4 py-2 bg-black text-white"
        >
          Add Warehouse
        </button>
      </form>

      {loading ? (
        <p>Loading warehouses...</p>
      ) : warehouses.length === 0 ? (
        <p>No warehouses found.</p>
      ) : (
        <div className="space-y-3">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <h2 className="font-semibold">{warehouse.name}</h2>
                <p className="text-gray-500">
                  {warehouse.location} · Capacity: {warehouse.capacity}
                </p>
              </div>

              <button
                onClick={() => deleteWarehouse(warehouse.id)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}