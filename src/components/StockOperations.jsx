import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const initialAdjustment = {
  product_id: "",
  transaction_type: "adjustment_in",
  quantity: "",
  reference: "",
  note: "",
};

export default function StockOperations({ activeTab, onChanged }) {
  const isHistory = activeTab === "Stock History";

  const [products, setProducts] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [adjustment, setAdjustment] = useState(initialAdjustment);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

 useEffect(() => {
  if (activeTab === "Stock History") {
    loadHistory();
  } else {
    loadProducts();
  }
}, [activeTab]);
  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity")
      .eq("active", true)
      .order("name");

    if (loadError) {
      setError(loadError.message);
    } else {
      setProducts(data ?? []);
    }

    setLoading(false);
  }

  async function loadHistory() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("stock_transactions")
      .select(`
        id,
        transaction_type,
        quantity,
        reference,
        note,
        created_at,
        products (
          name,
          sku,
          categories (name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (loadError) {
      setError(`Unable to load stock history: ${loadError.message}`);
      setStockHistory([]);
    } else {
      setStockHistory(data ?? []);
    }

    setLoading(false);
  }

  async function saveAdjustment(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const quantity = Number(adjustment.quantity);

    if (!adjustment.product_id) {
      setError("Select a product.");
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (!adjustment.note.trim()) {
      setError("Enter a reason for the adjustment.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from("stock_transactions")
      .insert({
        product_id: adjustment.product_id,
        transaction_type: adjustment.transaction_type,
        quantity,
        reference: adjustment.reference.trim() || null,
        note: adjustment.note.trim(),
      });

    if (saveError) {
      setError(`Unable to save adjustment: ${saveError.message}`);
      setSaving(false);
      return;
    }

    setMessage("Adjustment saved. Stock history has been updated.");
    setAdjustment(initialAdjustment);

    await loadProducts();
    await onChanged?.();
    setSaving(false);
  }

  const visibleHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return stockHistory.filter((item) => {
      const matchesType =
        historyFilter === "all" ||
        item.transaction_type === historyFilter;

      const searchFields = [
        item.products?.name,
        item.products?.sku,
        item.products?.categories?.name,
        item.reference,
        item.note,
        item.transaction_type,
      ];

      const matchesSearch =
        !query ||
        searchFields.some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        );

      return matchesType && matchesSearch;
    });
  }, [stockHistory, historySearch, historyFilter]);

  if (isHistory) {
    const labels = {
      purchase: "Purchase",
      sale: "Sale",
      adjustment_in: "Stock added",
      adjustment_out: "Stock removed",
    };

    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Stock History</h2>
        <p className="mt-1 text-sm text-gray-500">
          Purchases, sales, and stock adjustments.
        </p>

        <div className="my-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder="Search product, SKU, reference, or reason"
            className="w-full rounded-lg border p-3"
          />

          <select
            value={historyFilter}
            onChange={(event) => setHistoryFilter(event.target.value)}
            className="rounded-lg border bg-white p-3"
          >
            <option value="all">All transactions</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
            <option value="adjustment_in">Stock added</option>
            <option value="adjustment_out">Stock removed</option>
          </select>

          <button
            type="button"
            onClick={loadHistory}
            className="rounded-lg border px-4 py-3"
          >
            Refresh
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading history…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Reference / Reason</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((item) => {
                  const added = ["purchase", "adjustment_in"].includes(
                    item.transaction_type,
                  );

                  return (
                    <tr key={item.id} className="border-t">
                      <td className="whitespace-nowrap p-3">
                        {new Date(item.created_at).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3">
                        {item.products?.name ?? "Unknown product"}
                        <div className="text-xs text-gray-500">
                          {item.products?.sku ?? "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        {item.products?.categories?.name ?? "—"}
                      </td>
                      <td className="p-3">
                        {labels[item.transaction_type] ?? item.transaction_type}
                      </td>
                      <td className={`p-3 font-semibold ${added ? "text-green-700" : "text-red-600"}`}>
                        {added ? "+" : "−"}{item.quantity}
                      </td>
                      <td className="p-3">
                        {item.reference || "—"}
                        {item.note && (
                          <div className="mt-1 text-xs text-gray-500">{item.note}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {visibleHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No matching stock transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Stock Adjustment</h2>
      <p className="mb-5 mt-1 text-sm text-gray-500">
        Correct the stock count. Each adjustment is saved in Stock History.
      </p>

      {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}

      <form onSubmit={saveAdjustment} className="max-w-xl space-y-4">
        <label className="block text-sm font-medium">
          Product
          <select
            required
            value={adjustment.product_id}
            onChange={(event) =>
              setAdjustment({ ...adjustment, product_id: event.target.value })
            }
            className="mt-1 w-full rounded-lg border bg-white p-3"
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku || "No SKU"}) — Stock: {product.stock_quantity}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Adjustment
          <select
            value={adjustment.transaction_type}
            onChange={(event) =>
              setAdjustment({
                ...adjustment,
                transaction_type: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border bg-white p-3"
          >
            <option value="adjustment_in">Add stock</option>
            <option value="adjustment_out">Remove stock</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Quantity
          <input
            required
            type="number"
            min="1"
            step="1"
            value={adjustment.quantity}
            onChange={(event) =>
              setAdjustment({ ...adjustment, quantity: event.target.value })
            }
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>

        <label className="block text-sm font-medium">
          Reference (optional)
          <input
            value={adjustment.reference}
            onChange={(event) =>
              setAdjustment({ ...adjustment, reference: event.target.value })
            }
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>

        <label className="block text-sm font-medium">
          Reason
          <textarea
            required
            rows={3}
            value={adjustment.note}
            onChange={(event) =>
              setAdjustment({ ...adjustment, note: event.target.value })
            }
            placeholder="Physical count, damage, correction…"
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>

        <button
          disabled={saving || loading}
          className="rounded-lg bg-[#5934c5] px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Adjustment"}
        </button>
      </form>
    </section>
  );
}