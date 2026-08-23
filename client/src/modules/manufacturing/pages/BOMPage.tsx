import { useEffect, useState } from "react";

type Variant = {
  id: string;
  variantName: string;
  product: {
    id: string;
    name: string;
  };
};

type BOMItem = {
  componentVariantId: string;
  quantity: number;
};

type BOMVersion = {
  id: string;
  version: number;
  isActive: boolean;
  items: {
    id: string;
    quantity: number;
    componentVariant: Variant;
  }[];
};

type BOM = {
  id: string;
  name: string;
  description?: string | null;
  finishedVariant: Variant;
  versions: BOMVersion[];
};

export default function BOMPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [finishedVariantId, setFinishedVariantId] =
    useState("");

  const [items, setItems] = useState<BOMItem[]>([]);

  const [componentVariantId, setComponentVariantId] =
    useState("");
  const [componentQuantity, setComponentQuantity] =
    useState("1");

  const loadData = async () => {
    try {
      const [variantsResponse, bomsResponse] =
        await Promise.all([
         fetch("http://localhost:3001/api/catalog/products"),
          fetch("http://localhost:3001/api/boms"),
        ]);

      const variantsData =
        await variantsResponse.json();
      const bomsData = await bomsResponse.json();

      if (!variantsResponse.ok) {
        throw new Error(
          variantsData?.error ||
            "Failed to load product variants"
        );
      }

      if (!bomsResponse.ok) {
        throw new Error(
          bomsData?.error ||
            "Failed to load BOMs"
        );
      }

      const products = Array.isArray(variantsData)
  ? variantsData
  : variantsData.data || [];

const flattenedVariants: Variant[] =
  products.flatMap((product: any) =>
    (product.variants || []).map(
      (variant: any) => ({
        id: variant.id,
        variantName: variant.variantName,
        product: {
          id: product.id,
          name: product.name,
        },
      })
    )
  );

setVariants(flattenedVariants);

      setBoms(
        Array.isArray(bomsData)
          ? bomsData
          : []
      );
    } catch (error) {
      console.error("BOM load error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load BOM data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addComponent = () => {
    if (!componentVariantId) {
      alert("Please select a component.");
      return;
    }

    const quantity =
      Number(componentQuantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    const alreadyAdded = items.some(
      (item) =>
        item.componentVariantId ===
        componentVariantId
    );

    if (alreadyAdded) {
      alert(
        "This component is already in the BOM."
      );
      return;
    }

    setItems([
      ...items,
      {
        componentVariantId,
        quantity,
      },
    ]);

    setComponentVariantId("");
    setComponentQuantity("1");
  };

  const removeComponent = (
    componentId: string
  ) => {
    setItems(
      items.filter(
        (item) =>
          item.componentVariantId !==
          componentId
      )
    );
  };

  const createBOM = async () => {
    if (!name.trim()) {
      alert("Please enter a BOM name.");
      return;
    }

    if (!finishedVariantId) {
      alert(
        "Please select the finished product."
      );
      return;
    }

    if (items.length === 0) {
      alert(
        "Please add at least one component."
      );
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3001/api/boms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim() || null,
            finishedVariantId,
            items,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create BOM"
        );
      }

      alert("BOM created successfully!");

      setName("");
      setDescription("");
      setFinishedVariantId("");
      setItems([]);

      await loadData();
    } catch (error) {
      console.error("Create BOM error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not create BOM."
      );
    }
  };

  const getVariantName = (
    variantId: string
  ) => {
    const variant = variants.find(
      (item) => item.id === variantId
    );

    if (!variant) return "Unknown component";

    return `${variant.product.name} — ${variant.variantName}`;
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-600">
        Loading BOM management...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Bill of Materials
        </h1>

        <p className="text-gray-500 mt-1">
          Create and manage product recipes and
          BOM versions.
        </p>
      </div>

      {/* Create BOM */}
      <div className="bg-white border rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-5">
          Create BOM
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              BOM Name
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Laptop Assembly BOM"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Finished Product
            </label>

            <select
              value={finishedVariantId}
              onChange={(e) =>
                setFinishedVariantId(
                  e.target.value
                )
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">
                Select finished product
              </option>

              {variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                >
                  {variant.product.name} —{" "}
                  {variant.variantName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Describe this BOM..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Components */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">
            Components
          </h3>

          <div className="grid md:grid-cols-[1fr_150px_auto] gap-3">
            <select
              value={componentVariantId}
              onChange={(e) =>
                setComponentVariantId(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2"
            >
              <option value="">
                Select component
              </option>

              {variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                >
                  {variant.product.name} —{" "}
                  {variant.variantName}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={componentQuantity}
              onChange={(e) =>
                setComponentQuantity(
                  e.target.value
                )
              }
              className="border rounded-lg px-3 py-2"
              placeholder="Quantity"
            />

            <button
              type="button"
              onClick={addComponent}
              className="px-4 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
            >
              Add Component
            </button>
          </div>

          {items.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.componentVariantId}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {getVariantName(
                        item.componentVariantId
                      )}
                    </p>

                    <p className="text-sm text-gray-500">
                      Quantity:{" "}
                      {item.quantity}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeComponent(
                        item.componentVariantId
                      )
                    }
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={createBOM}
          className="mt-6 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Create BOM
        </button>
      </div>

      {/* Existing BOMs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Existing BOMs
        </h2>

        {boms.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
            No BOMs created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {boms.map((bom) => (
              <div
                key={bom.id}
                className="bg-white border rounded-xl p-5 shadow-sm"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {bom.name}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Finished Product:{" "}
                      {bom.finishedVariant.product.name}{" "}
                      —{" "}
                      {
                        bom.finishedVariant
                          .variantName
                      }
                    </p>

                    {bom.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {bom.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {bom.versions.map(
                    (version) => (
                      <div
                        key={version.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            Version{" "}
                            {version.version}
                          </span>

                          {version.isActive && (
                            <span className="text-sm text-green-600 font-medium">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          {version.items.length ===
                          0 ? (
                            "No components"
                          ) : (
                            version.items
                              .map(
                                (item) =>
                                  `${item.componentVariant.product.name} — ${item.componentVariant.variantName} × ${item.quantity}`
                              )
                              .join(", ")
                          )}
                        </div>
                      </div>
                    )
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
