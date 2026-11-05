// import { useEffect, useState } from "react";
// import { supabase } from "../lib/supabase";
// export default function StaffDashboard({ onSignOut }) {
//   const [products, setProducts] = useState([]);
//   const [selectedProduct, setSelectedProduct] = useState("");
//   const [quantity, setQuantity] = useState("");
//   const [totalAmount, setTotalAmount] = useState("");
//   const [search, setSearch] = useState("");
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     loadProducts();
//   }, []);

//   async function loadProducts() {
//     const { data, error } = await supabase
//       .from("products")
//       .select("id, name, sku, stock_quantity")
//       .eq("active", true)
//       .order("name");

//     if (error) {
//       setError("Unable to load products: " + error.message);
//       return;
//     }

//     setProducts(data || []);
//   }

//   const filteredProducts = products.filter((product) =>
//     `${product.name} ${product.sku || ""}`
//       .toLowerCase()
//       .includes(search.toLowerCase()),
//   );

//   const currentProduct = products.find(
//     (product) => product.id === selectedProduct,
//   );
//   const [viewMode, setViewMode] = useState("list");

//   async function handleSaveSale() {
//     setError("");
//     setMessage("");

//     const saleQuantity = Number(quantity);
//     const saleAmount = Number(totalAmount);

//     if (!selectedProduct) {
//       setError("Please select a product.");
//       return;
//     }

//     if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) {
//       setError("Enter a valid quantity.");
//       return;
//     }

//     if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
//       setError("Enter a valid sale amount.");
//       return;
//     }

//     if (saleQuantity > currentProduct.stock_quantity) {
//       setError("Not enough stock available.");
//       return;
//     }

//     setSubmitting(true);

//     try {
//       const { error } = await supabase.rpc("record_sale", {
//         p_product_id: selectedProduct,
//         p_quantity: saleQuantity,
//         p_total_amount: saleAmount,
//         p_reference: null,
//         p_note: null,
//       });

//       if (error) throw error;

//       setMessage("Sale recorded successfully.");
//       setSelectedProduct("");
//       setQuantity("");
//       setTotalAmount("");
//       setSearch("");

//       await loadProducts();
//     } catch (err) {
//       setError(err.message || "Unable to record sale.");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <header className="mb-8 flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
//           <p className="text-sm text-gray-500">Manage customer sales</p>
//         </div>

//         <button
//           onClick={onSignOut}
//           className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
//         >
//           Sign Out
//         </button>
//       </header>

//       <main className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
//         <h2 className="text-lg font-semibold text-gray-800">New Sale</h2>
//         <div className="mt-4 flex gap-2">
//           <button
//             type="button"
//             onClick={() => setViewMode("list")}
//             className={`rounded-lg px-4 py-2 text-sm font-medium ${
//               viewMode === "list"
//                 ? "bg-[#5934c5] text-white"
//                 : "border border-gray-300 text-gray-600"
//             }`}
//           >
//             <span className="inline-flex items-center gap-2">
//               <icon name="list" />
//               List View
//             </span>
//           </button>

//           <button
//             type="button"
//             onClick={() => setViewMode("cards")}
//             className={`rounded-lg px-4 py-2 text-sm font-medium ${
//               viewMode === "cards"
//                 ? "bg-[#5934c5] text-white"
//                 : "border border-gray-300 text-gray-600"
//             }`}
//           >
//             <span className="inline-flex items-center gap-2">
//               <icon name="layout-grid" />
//               Card View
//             </span>
//           </button>
//         </div>
//         {error && (
//           <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
//             {error}
//           </p>
//         )}

//         {message && (
//           <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
//             {message}
//           </p>
//         )}

//         <div className="mt-6 space-y-5">
//           <div>
//             <label className="mb-2 block text-sm font-medium">Products</label>

//             <div
//               className={
//                 viewMode === "list"
//                   ? "space-y-2"
//                   : "grid grid-cols-1 gap-3 sm:grid-cols-2"
//               }
//             >
//               {filteredProducts.map((product) => (
//                 <button
//                   key={product.id}
//                   type="button"
//                   onClick={() => setSelectedProduct(product.id)}
//                   className={`w-full rounded-lg border p-4 text-left transition ${
//                     selectedProduct === product.id
//                       ? "border-[#5934c5] bg-purple-50"
//                       : "border-gray-200 bg-white hover:border-gray-400"
//                   }`}
//                 >
//                   <div className="flex items-center justify-between gap-3">
//                     <div>
//                       <p className="font-semibold text-gray-800">
//                         {product.name}
//                       </p>
//                       <p className="mt-1 text-xs text-gray-500">
//                         SKU: {product.sku || "No SKU"}
//                       </p>
//                     </div>

//                     <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
//                       Stock: {product.stock_quantity}
//                     </span>
//                   </div>
//                 </button>
//               ))}
//             </div>

//             {filteredProducts.length === 0 && (
//               <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
//                 No matching products found.
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="mb-2 block text-sm font-medium">
//               Select Product
//             </label>
//             <select
//               value={selectedProduct}
//               onChange={(e) => setSelectedProduct(e.target.value)}
//               className="w-full rounded-lg border border-gray-300 px-4 py-3"
//             >
//               <option value="">Choose a product</option>
//               {filteredProducts.map((product) => (
//                 <option key={product.id} value={product.id}>
//                   {product.name} — {product.sku || "No SKU"}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {currentProduct && (
//             <p className="text-sm text-gray-600">
//               Available stock: <strong>{currentProduct.stock_quantity}</strong>
//             </p>
//           )}

//           <div>
//             <label className="mb-2 block text-sm font-medium">Quantity</label>
//             <input
//               type="number"
//               min="1"
//               step="1"
//               value={quantity}
//               onChange={(e) => setQuantity(e.target.value)}
//               placeholder="Enter quantity"
//               className="w-full rounded-lg border border-gray-300 px-4 py-3"
//             />
//           </div>

//           <div>
//             <label className="mb-2 block text-sm font-medium">
//               Final Sale Amount (₹)
//             </label>
//             <input
//               type="number"
//               min="0.01"
//               step="0.01"
//               value={totalAmount}
//               onChange={(e) => setTotalAmount(e.target.value)}
//               placeholder="Enter negotiated total amount"
//               className="w-full rounded-lg border border-gray-300 px-4 py-3"
//             />
//           </div>

//           <button
//             type="button"
//             onClick={handleSaveSale}
//             disabled={submitting}
//             className="w-full rounded-lg bg-[#5934c5] py-3 font-medium text-white hover:bg-[#4825ac] disabled:opacity-60"
//           >
//             {submitting ? "Saving Sale..." : "Save Sale"}
//           </button>
//         </div>
//       </main>
//     </div>
//   );
// }



import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function StaffDashboard({ onSignOut }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Load active products and their categories
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoadingProducts(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        stock_quantity,
        category_id,
        categories(name)
      `)
      .eq("active", true)
      .order("name");

    if (error) {
      setError("Unable to load products: " + error.message);
      setLoadingProducts(false);
      return;
    }

    setProducts(data || []);
    setLoadingProducts(false);
  }

  // Search by product name, SKU or category
  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return products;

    return products.filter((product) => {
      const categoryName = product.categories?.name || "";

      const searchableText = [
        product.name,
        product.sku,
        categoryName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }, [products, search]);

  const currentProduct = products.find(
    (product) => product.id === selectedProduct
  );

  // Record a sale through the secure Supabase RPC
  async function handleSaveSale() {
    setError("");
    setMessage("");

    const saleQuantity = Number(quantity);
    const saleAmount = Number(totalAmount);

    if (!currentProduct) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) {
      setError("Please enter a valid whole-number quantity.");
      return;
    }

    if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
      setError("Please enter a valid sale amount.");
      return;
    }

    if (saleQuantity > currentProduct.stock_quantity) {
      setError(
        `Only ${currentProduct.stock_quantity} units are currently available.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.rpc("record_sale", {
        p_product_id: selectedProduct,
        p_quantity: saleQuantity,
        p_total_amount: saleAmount,
        p_reference: null,
        p_note: null,
      });

      if (error) throw error;

      setMessage(
        `Sale recorded successfully: ${saleQuantity} × ${currentProduct.name}`
      );

      setSelectedProduct("");
      setQuantity("");
      setTotalAmount("");
      setSearch("");

      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to record sale.");
    } finally {
      setSubmitting(false);
    }
  }

  function selectProduct(product) {
    if (product.stock_quantity <= 0) return;

    setSelectedProduct(product.id);
    setError("");
    setMessage("");
  }

  const totalActiveStock = products.reduce(
    (total, product) => total + Number(product.stock_quantity || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">

      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5934c5] text-lg font-bold text-white">
                A
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  ARJ Inventory
                </h1>
                <p className="text-xs text-gray-500">
                  Staff workspace
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Sign Out
          </button>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        {/* PAGE TITLE */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-[#5934c5]">
            SALES COUNTER
          </p>

          <h2 className="text-3xl font-bold tracking-tight">
            New Sale
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Search products, select items and record customer sales.
          </p>
        </div>

        {/* QUICK STATS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Active Designs
            </p>

            <p className="mt-2 text-3xl font-bold">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Total Available Stock
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalActiveStock}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Across all active products
            </p>
          </div>

        </div>

        {/* ALERTS */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <span>{message}</span>

            <button
              onClick={() => setMessage("")}
              className="font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">

          {/* PRODUCT SEARCH */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Select Products
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Search and select a product to sell.
                </p>
              </div>

              {/* VIEW TOGGLE */}
              <div className="flex rounded-xl bg-gray-100 p-1">

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    viewMode === "list"
                      ? "bg-white text-[#5934c5] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  List View
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    viewMode === "cards"
                      ? "bg-white text-[#5934c5] shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Card View
                </button>

              </div>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative mb-5">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU or category..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#5934c5] focus:bg-white focus:ring-2 focus:ring-purple-100"
              />

            </div>

            {/* PRODUCT COUNT */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Available Products
              </p>

              <p className="text-xs text-gray-500">
                {filteredProducts.length} results
              </p>
            </div>

            {/* PRODUCT RESULTS */}
            {loadingProducts ? (

              <div className="rounded-xl bg-gray-50 py-12 text-center">
                <p className="text-sm text-gray-500">
                  Loading products...
                </p>
              </div>

            ) : filteredProducts.length === 0 ? (

              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <p className="font-medium text-gray-700">
                  No products found
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  Try another product name, SKU or category.
                </p>
              </div>

            ) : (

              <div
                className={
                  viewMode === "list"
                    ? "max-h-142.5 space-y-2 overflow-y-auto pr-1"
                    : "max-h-142.5 grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2"
                }
              >

                {filteredProducts.map((product) => {
                  const isSelected = selectedProduct === product.id;
                  const isOutOfStock = product.stock_quantity <= 0;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => selectProduct(product)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#5934c5] bg-purple-50 ring-2 ring-purple-100"
                          : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
                      } ${
                        isOutOfStock
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-800">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            SKU: {product.sku || "Not assigned"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {product.categories?.name || "Uncategorised"}
                          </p>

                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              isOutOfStock
                                ? "bg-red-50 text-red-600"
                                : product.stock_quantity <= 5
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-green-50 text-green-700"
                            }`}
                          >
                            {isOutOfStock
                              ? "Out of stock"
                              : `Stock: ${product.stock_quantity}`}
                          </span>

                          {isSelected && (
                            <span className="text-xs font-semibold text-[#5934c5]">
                              Selected
                            </span>
                          )}

                        </div>

                      </div>

                    </button>
                  );
                })}

              </div>

            )}

          </section>

          {/* SALE FORM */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">

            <div className="mb-5">
              <h3 className="text-lg font-bold">
                Sale Details
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Enter the final customer sale details.
              </p>
            </div>

            {/* SELECTED PRODUCT */}
            {currentProduct ? (

              <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-purple-600">
                  Selected Product
                </p>

                <p className="mt-2 font-bold text-gray-900">
                  {currentProduct.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  SKU: {currentProduct.sku || "Not assigned"}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-purple-200 pt-3">

                  <span className="text-sm text-gray-600">
                    Available stock
                  </span>

                  <span className="font-bold text-[#5934c5]">
                    {currentProduct.stock_quantity}
                  </span>

                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct("")}
                  className="mt-3 text-xs font-medium text-purple-700 hover:underline"
                >
                  Change selection
                </button>

              </div>

            ) : (

              <div className="mb-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">

                <p className="font-medium text-gray-700">
                  No product selected
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Choose a product from the search results.
                </p>

              </div>

            )}

            {/* QUANTITY */}
            <div className="mb-5">

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                step="1"
                max={currentProduct?.stock_quantity || undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                disabled={!currentProduct}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-[#5934c5] focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
              />

              {currentProduct && (
                <p className="mt-2 text-xs text-gray-400">
                  Maximum available: {currentProduct.stock_quantity}
                </p>
              )}

            </div>

            {/* SALE AMOUNT */}
            <div className="mb-6">

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Final Sale Amount
              </label>

              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Enter negotiated amount"
                  disabled={!currentProduct}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 outline-none transition focus:border-[#5934c5] focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50"
                />

              </div>

              <p className="mt-2 text-xs text-gray-400">
                Enter the total agreed amount for this sale.
              </p>

            </div>

            {/* SAVE BUTTON */}
            <button
              type="button"
              onClick={handleSaveSale}
              disabled={
                submitting ||
                loadingProducts ||
                !currentProduct
              }
              className="w-full rounded-xl bg-[#5934c5] py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#4825ac] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Recording Sale..." : "Confirm & Save Sale"}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
              Saving a sale automatically deducts the sold quantity from inventory.
            </p>

          </section>

        </div>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-gray-200 py-5 text-center">
          <p className="text-xs text-gray-400">
            ARJ Inventory · Staff Workspace
          </p>
        </footer>

      </main>
    </div>
  );
}
