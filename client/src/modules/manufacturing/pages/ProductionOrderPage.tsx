import { useEffect, useState } from "react";

type BOM = {
  id: string;
  name: string;
  versions: {
    id: string;
    version: number;
    isActive: boolean;
    bom: {
      finishedVariantId: string;
    };
  }[];
};

type Warehouse = {
  id: string;
  name: string;
  location: string;
};

type ProductionOrder = {
  id: string;
  orderNumber: string;
  quantity: number;
  status: string;
  warehouse: {
    name: string;
  };
  finishedVariant: {
    variantName: string;
    product: {
      name: string;
    };
  };
  items: {
    componentVariant: {
      variantName: string;
      product: {
        name: string;
      };
    };
    requiredQuantity: number;
    consumedQuantity: number;
  }[];
};

export default function ProductionOrderPage() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);

  const [bomVersionId, setBomVersionId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [orderNumber, setOrderNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [bomResponse, warehouseResponse, orderResponse] =
        await Promise.all([
          fetch("http://localhost:3001/api/boms"),
          fetch("http://localhost:3001/api/inventory/warehouses"),
          fetch("http://localhost:3001/api/production-orders"),
        ]);

      const bomData = await bomResponse.json();
      const warehouseData = await warehouseResponse.json();
      const orderData = await orderResponse.json();

      setBoms(Array.isArray(bomData) ? bomData : []);
      setWarehouses(
        Array.isArray(warehouseData) ? warehouseData : []
      );
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (error) {
      console.error("Load production data error:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createOrder = async () => {
    if (!bomVersionId || !warehouseId || !quantity) {
      alert("Please select a BOM, warehouse and quantity.");
      return;
    }

    const productionQuantity = Number(quantity);

    if (
      !Number.isInteger(productionQuantity) ||
      productionQuantity <= 0
    ) {
      alert("Quantity must be a positive whole number.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:3001/api/production-orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber: orderNumber.trim() || undefined,
            bomVersionId,
            warehouseId,
            quantity: productionQuantity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to create production order"
        );
      }

      alert("Production order created successfully!");

      setOrderNumber("");
      setBomVersionId("");
      setWarehouseId("");
      setQuantity("1");

      await loadData();
    } catch (error) {
      console.error("Create production order error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create production order."
      );
    } finally {
      setLoading(false);
    }
  };

  const startOrder = async (id: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/production-orders/${id}/start`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to start production order"
        );
      }

      alert("Production order started.");
      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start production order."
      );
    }
  };

  const completeOrder = async (id: string) => {
  if (
    !window.confirm(
      "Complete this production order? This will consume component inventory and add the finished product to inventory."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3001/api/production-orders/${id}/complete`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Failed to complete production order"
      );
    }

    alert(
      "Production completed. Inventory has been updated."
    );

    await loadData();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Failed to complete production order."
    );
  }
};

const cancelOrder = async (id: string) => {
  if (
    !window.confirm(
      "Cancel this production order? This cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3001/api/production-orders/${id}/cancel`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "Failed to cancel production order"
      );
    }

    alert("Production order cancelled.");

    await loadData();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Failed to cancel production order."
    );
  }
};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Production Orders
        </h1>

        <p className="text-gray-500 mt-1">
          Create and manage manufacturing production orders.
        </p>
      </div>

      {/* CREATE ORDER */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Create Production Order
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Order Number
            </label>

            <input
              value={orderNumber}
              onChange={(e) =>
                setOrderNumber(e.target.value)
              }
              placeholder="Optional — auto generated"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Production Quantity
            </label>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              BOM Version
            </label>

            <select
              value={bomVersionId}
              onChange={(e) =>
                setBomVersionId(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">
                Select BOM
              </option>

              {boms.flatMap((bom) =>
                bom.versions
                  .filter((version) => version.isActive)
                  .map((version) => (
                    <option
                      key={version.id}
                      value={version.id}
                    >
                      {bom.name} — Version{" "}
                      {version.version}
                    </option>
                  ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Warehouse
            </label>

            <select
              value={warehouseId}
              onChange={(e) =>
                setWarehouseId(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">
                Select warehouse
              </option>

              {warehouses.map((warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.name} —{" "}
                  {warehouse.location}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={createOrder}
          disabled={loading}
          className="mt-5 px-5 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Production Order"}
        </button>
      </div>

      {/* ORDERS */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Production Orders
        </h2>

        {orders.length === 0 ? (
          <p className="text-gray-500">
            No production orders created yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {order.orderNumber}
                    </h3>

                    <p className="text-sm text-gray-600">
                      {
                        order.finishedVariant.product
                          .name
                      }{" "}
                      —{" "}
                      {
                        order.finishedVariant.variantName
                      }
                    </p>

                    <p className="text-sm text-gray-500">
                      Quantity: {order.quantity} ·{" "}
                      Warehouse:{" "}
                      {order.warehouse.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100">
                      {order.status}
                    </span>

                    {order.status === "PLANNED" && (
  <>
    <button
      onClick={() => startOrder(order.id)}
      className="px-3 py-2 rounded-lg border"
    >
      Start
    </button>

    <button
      onClick={() => cancelOrder(order.id)}
      className="px-3 py-2 rounded-lg border border-red-300 text-red-600"
    >
      Cancel
    </button>
  </>
)}

{order.status === "IN_PROGRESS" && (
  <>
    <button
      onClick={() => completeOrder(order.id)}
      className="px-3 py-2 rounded-lg bg-black text-white"
    >
      Complete
    </button>

    <button
      onClick={() => cancelOrder(order.id)}
      className="px-3 py-2 rounded-lg border border-red-300 text-red-600"
    >
      Cancel
    </button>
  </>
)}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Required Components
                  </p>

                  {order.items.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No components.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div
                          key={item.componentVariant.variantName}
                          className="text-sm flex justify-between border-b py-1"
                        >
                          <span>
                            {
                              item.componentVariant
                                .product.name
                            }{" "}
                            —{" "}
                            {
                              item.componentVariant
                                .variantName
                            }
                          </span>

                          <span>
                            {item.consumedQuantity} /{" "}
                            {item.requiredQuantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}