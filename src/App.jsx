import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

//SECTION 01 - NAVIGATION MENU

const navigation = [
  ["⌂", "Dashboard"],
  ["▦", "Categories"],
  ["□", "Products"],
  ["↓", "Stock In (Purchase)"],
  ["↑", "Stock Out (Sales)"],
  ["↻", "Stock Adjustment"],
  ["◷", "Stock History"],
  ["▥", "Reports"],
  ["!", "Low Stock Alerts"],
];

//SECTION 02 - DASHBOARD STATE

function downloadCSV(filename, rows) {
  if (!rows.length) {
    alert("No data available to export.");
    return;
  }

  const escapeCSV = (value) => {
    let text = String(value ?? "");

    // Prevent spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    Object.keys(rows[0]).map(escapeCSV).join(","),
    ...rows.map((row) => Object.values(row).map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function InventoryDashboard({ onSignOut }) {
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [filter, setFilter] = useState("All Categories");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("All Categories");
  const [products, setProducts] = useState([]);

  const [stockHistory, setStockHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [reportPeriod, setReportPeriod] = useState("all");
  const [reportLoading, setReportLoading] = useState(false);

  const [reportData, setReportData] = useState({
    products: [],
    transactions: [],
  });

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [stockCategory, setStockCategory] = useState("");
  const [stockAction, setStockAction] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockMessage, setStockMessage] = useState("");

  //SECTION 03 - PRODUCT LOADING EFFECT

  useEffect(() => {
    if (
      activeNav === "Products" ||
      activeNav === "Categories" ||
      activeNav === "Stock In (Purchase)" ||
      activeNav === "Stock Out (Sales)" ||
      activeNav === "Stock Adjustment"
    ) {
      loadProducts();
    }
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "Stock History") return;

    async function loadStockHistory() {
      setHistoryLoading(true);

      try {
        const { data, error } = await supabase
          .from("stock_transactions")
          .select(
            `
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
        `,
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        setStockHistory(data ?? []);
      } catch (error) {
        console.error("Unable to load stock history:", error);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadStockHistory();
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "Reports") return;

    async function loadReportData() {
      setReportLoading(true);

      try {
        const [productsResult, transactionsResult] = await Promise.all([
          supabase
            .from("products")
            .select(
              `
            id,
            sku,
            name,
            category_id,
            stock_quantity,
            minimum_stock,
            active,
            categories (name)
          `,
            )
            .eq("active", true),

          supabase
            .from("stock_transactions")
            .select(
              `
            id,
            product_id,
            transaction_type,
            quantity,
            created_at
          `,
            )
            .order("created_at", { ascending: false }),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        setReportData({
          products: productsResult.data ?? [],
          transactions: transactionsResult.data ?? [],
        });
      } catch (error) {
        console.error("Unable to load report data:", error);
      } finally {
        setReportLoading(false);
      }
    }

    loadReportData();
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "Low Stock Alerts") return;

    async function loadLowStockData() {
      setReportLoading(true);

      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            `
          id,
          sku,
          name,
          category_id,
          stock_quantity,
          minimum_stock,
          active,
          categories (name)
        `,
          )
          .eq("active", true);

        if (error) throw error;

        setReportData((previous) => ({
          ...previous,
          products: data ?? [],
        }));
      } catch (error) {
        console.error("Unable to load low-stock products:", error);
      } finally {
        setReportLoading(false);
      }
    }

    loadLowStockData();
  }, [activeNav, inventoryRefresh]);

  //SECTION 04 - INVENTORY DATABASE LOADING

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setDataLoading(true);
      setDataError("");

      try {
        const [categoryResult, productResult, transactionResult] =
          await Promise.all([
            supabase.from("categories").select("id, name").order("name"),

            supabase
              .from("products")
              .select(
                "id, category_id, sku, name, stock_quantity, minimum_stock, active",
              ),

            supabase
              .from("stock_transactions")
              .select(
                "id, product_id, transaction_type, quantity, reference, note, created_at",
              )
              .order("created_at", { ascending: false })
              .limit(10),
          ]);

        if (categoryResult.error) throw categoryResult.error;
        if (productResult.error) throw productResult.error;
        if (transactionResult.error) throw transactionResult.error;

        const dbCategories = categoryResult.data ?? [];
        const dbProducts = productResult.data ?? [];
        const dbTransactions = transactionResult.data ?? [];

        const iconMap = {
          Earrings: "♢",
          Necklaces: "◇",
          Rings: "○",
          Bracelets: "⌁",
          Bangles: "◎",
          Sets: "✧",
          "Maang Tikka": "♧",
          Anklets: "⌁",
          "Nose Pins": "◦",
          "Hair Accessories": "✿",
          Pendants: "♢",
          Chains: "⌁",
          Charms: "✦",
          Brooches: "❖",
          "Toe Rings": "○",
        };

        const productMap = new Map(
          dbProducts.map((product) => [product.id, product]),
        );

        const categoryMap = new Map();

        for (const category of dbCategories) {
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            stock: 0,
            purchased: 0,
            sold: 0,
            designs: 0,
            icon: iconMap[category.name] ?? "◇",
            min: 0,
          });
        }

        for (const product of dbProducts) {
          const category = categoryMap.get(product.category_id);

          if (!category || !product.active) continue;

          category.stock += product.stock_quantity;
          category.designs += 1;
          category.min += product.minimum_stock;
        }

        const activityRows = [];

        for (const transaction of dbTransactions) {
          const product = productMap.get(transaction.product_id);
          const category = product
            ? categoryMap.get(product.category_id)
            : null;

          if (category) {
            if (transaction.transaction_type === "purchase") {
              category.purchased += transaction.quantity;
            }

            if (transaction.transaction_type === "sale") {
              category.sold += transaction.quantity;
            }
          }

          activityRows.push({
            id: transaction.id,
            action: `${transaction.transaction_type.replaceAll("_", " ")} ${
              transaction.quantity
            } pcs of ${product?.name ?? "Unknown product"}`,
            ref: transaction.reference || product?.sku || "",
            time: new Date(transaction.created_at).toLocaleString(),
            type: transaction.transaction_type,
          });
        }

        // Load all transactions to calculate lifetime purchase and sale totals.
        // The recent-activity query above is deliberately limited to 10.
        const { data: allTransactions, error: historyError } = await supabase
          .from("stock_transactions")
          .select("product_id, transaction_type, quantity");

        if (historyError) throw historyError;

        // Recalculate lifetime totals for each category.
        for (const category of categoryMap.values()) {
          category.purchased = 0;
          category.sold = 0;
        }

        for (const transaction of allTransactions ?? []) {
          const product = productMap.get(transaction.product_id);
          const category = product
            ? categoryMap.get(product.category_id)
            : null;

          if (!category) continue;

          if (transaction.transaction_type === "purchase") {
            category.purchased += transaction.quantity;
          }

          if (transaction.transaction_type === "sale") {
            category.sold += transaction.quantity;
          }
        }

        if (!cancelled) {
          setCategories([...categoryMap.values()]);
          setActivities(activityRows);
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(error.message || "Unable to load inventory.");
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, [inventoryRefresh]);

  //SECTION 05 - DASHBOARD TOTALS

  const totalStock = categories.reduce((sum, c) => sum + c.stock, 0);
  const totalPurchased = categories.reduce((sum, c) => sum + c.purchased, 0);
  const totalSold = categories.reduce((sum, c) => sum + c.sold, 0);
  const lowStock = categories.filter((c) => c.stock <= c.min);

  //SECTION 06 - CATEGORY FILTERING

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => {
        const matchesFilter = filter === "All Categories" || c.name === filter;
        const matchesSearch = c.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesLow = activeNav !== "Low Stock Alerts" || c.stock <= c.min;
        return matchesFilter && matchesSearch && matchesLow;
      }),
    [categories, filter, search, activeNav],
  );

  const reportSummary = useMemo(() => {
    const products = reportData.products;
    const transactions = reportData.transactions;

    const now = new Date();
    let startDate = null;

    if (reportPeriod === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (reportPeriod === "7days") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (reportPeriod === "30days") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
    }

    const filteredTransactions = transactions.filter((transaction) => {
      return !startDate || new Date(transaction.created_at) >= startDate;
    });

    const totalStock = products.reduce(
      (sum, product) => sum + Number(product.stock_quantity || 0),
      0,
    );

    const lowStockProducts = products.filter(
      (product) =>
        Number(product.stock_quantity || 0) <=
        Number(product.minimum_stock || 0),
    );

    const countType = (type) =>
      filteredTransactions
        .filter((transaction) => transaction.transaction_type === type)
        .reduce(
          (sum, transaction) => sum + Number(transaction.quantity || 0),
          0,
        );

    const categoryMap = {};

    products.forEach((product) => {
      const categoryName = product.categories?.name || "Uncategorized";

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          designs: 0,
          stock: 0,
        };
      }

      categoryMap[categoryName].designs += 1;
      categoryMap[categoryName].stock += Number(product.stock_quantity || 0);
    });

    return {
      totalDesigns: products.length,
      totalStock,
      lowStockCount: lowStockProducts.length,
      purchaseQuantity: countType("purchase"),
      salesQuantity: countType("sale"),
      adjustmentIn: countType("adjustment_in"),
      adjustmentOut: countType("adjustment_out"),
      transactionCount: filteredTransactions.length,
      categories: Object.values(categoryMap).sort((a, b) => b.stock - a.stock),
      lowStockProducts,
    };
  }, [reportData, reportPeriod]);

  //SECTION 07 - PRODUCT DATA LOADER

  async function loadProducts() {
    setProductLoading(true);
    setProductError("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
        id,
        sku,
        name,
        variant,
        category_id,
        stock_quantity,
        minimum_stock,
        active,
        categories (
          name
        )
      `,
        )
        .eq("active", true)
        .order("name");

      if (error) throw error;

      setProducts(data ?? []);
    } catch (err) {
      setProductError(err.message || "Unable to load products.");
    } finally {
      setProductLoading(false);
    }
  }

  //SECTION 08 - ADD AND EDIT PRODUCT

  async function saveProduct(event) {
    event.preventDefault();
    setProductError("");
    setProductMessage("");

    const form = new FormData(event.currentTarget);

    const product = {
      sku: String(form.get("sku")).trim(),
      name: String(form.get("name")).trim(),
      category_id: String(form.get("category_id")),
      variant: String(form.get("variant") || "").trim() || null,
      minimum_stock: Number(form.get("minimum_stock") || 5),
    };

    if (!product.sku || !product.name || !product.category_id) {
      setProductError("SKU, name and category are required.");
      return;
    }

    if (!Number.isInteger(product.minimum_stock) || product.minimum_stock < 0) {
      setProductError("Minimum stock must be a non-negative whole number.");
      return;
    }

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(product)
          .eq("id", editingProduct.id);

        if (error) throw error;
        setProductMessage("Product updated successfully.");
      } else {
        const { error } = await supabase.from("products").insert(product);

        if (error) throw error;
        setProductMessage("Product added successfully.");
      }

      setShowProductForm(false);
      setEditingProduct(null);

      await loadProducts();
      if (typeof setInventoryRefresh === "function") {
        setInventoryRefresh((value) => value + 1);
      }
    } catch (err) {
      setProductError(err.message || "Unable to save product.");
    }
  }

  // SECTION: DELETE OR ARCHIVE PRODUCT
  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? If it has transaction history, it will be archived instead.`,
    );

    if (!confirmed) return;

    setProductError("");
    setProductMessage("");

    try {
      // First, try permanent deletion.
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (!deleteError) {
        setProductMessage("Product deleted successfully.");
      } else {
        // If history prevents deletion, archive the product instead.
        const { error: archiveError } = await supabase
          .from("products")
          .update({ active: false })
          .eq("id", product.id);

        if (archiveError) throw archiveError;

        setProductMessage(
          "Product archived because it has transaction history.",
        );
      }

      await loadProducts();
      setInventoryRefresh((value) => value + 1);
    } catch (err) {
      setProductError(err.message || "Unable to delete or archive product.");
    }
  }

  //SECTION 09 - PURCHASE AND SALE HANDLER

  async function submitStockTransaction(event) {
    event.preventDefault();
    setStockError("");
    setStockMessage("");

    const form = new FormData(event.currentTarget);
    const productId = String(
      form.get("product_id") || selectedProduct?.id || "",
    );
    const quantity = Number(form.get("quantity"));
    const reference = String(form.get("reference") || "").trim();
    const note = String(form.get("note") || "").trim();

    const action =
      activeNav === "Stock In (Purchase)"
        ? "purchase"
        : activeNav === "Stock Out (Sales)"
          ? "sale"
          : stockAction;

    if (!productId || !["purchase", "sale"].includes(action)) {
      setStockError("Please select a product and transaction type.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setStockError("Quantity must be a positive whole number.");
      return;
    }

    setStockSaving(true);

    try {
      const { error } = await supabase.from("stock_transactions").insert({
        product_id: productId,
        transaction_type: action,
        quantity,
        reference: reference || null,
        note: note || null,
      });

      if (error) throw error;

      setStockMessage(
        `${action === "purchase" ? "Purchase" : "Sale"} recorded successfully.`,
      );

      setSelectedProduct(null);
      setStockAction(null);

      await loadProducts();
      setInventoryRefresh((value) => value + 1);
    } catch (err) {
      setStockError(err.message || "Unable to record transaction.");
    } finally {
      setStockSaving(false);
    }
  }

  //SECTION 10 - MAIN DASHBOARD LAYOUT

  return (
    <div className="min-h-screen bg-[#f9f8fc] text-[#211b2e] md:flex">
      {/* SECTION 11 - SIDEBAR AND NAVIGATION */}
      <aside className="flex shrink-0 flex-col bg-white md:fixed md:inset-y-0 md:w-60 md:border-r md:border-[#ece8f2]">
        <div className="flex items-center gap-3 bg-[#261a45] px-5 py-5 text-white">
          <span className="text-3xl text-[#e5c18b]">♢</span>
          <div className="font-serif text-xl leading-tight">
            ARJ
            <div>Inventory</div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {navigation.map(([icon, label]) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                setFilter("All Categories");
                setSearch("");
              }}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                activeNav === label
                  ? "bg-[#eee8ff] font-semibold text-[#5732c5]"
                  : "text-[#5d5868] hover:bg-[#f7f4fc]"
              }`}
            >
              <span className="w-5 text-center text-lg">{icon}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="m-4 mt-auto hidden rounded-xl bg-[#f5f0ff] p-5 md:block">
          <p className="text-sm text-[#716a7d]">Total Categories</p>
          <p className="mb-4 mt-1 text-2xl font-bold text-[#5630bc]">
            {categories.length}
          </p>
          <p className="text-sm text-[#716a7d]">Total Designs</p>
          <p className="mt-1 text-2xl font-bold text-[#5630bc]">
            {categories.reduce((sum, c) => sum + c.designs, 0)}
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-60">
        {/* SECTION 12 - PAGE HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece8f2] bg-white px-5 py-6 md:px-8">
          <div>
            <h1 className="text-2xl font-bold">{activeNav}</h1>
            <p className="mt-1 text-sm text-[#817b8c]">
              Manage your inventory, one category at a time
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-lg border border-[#e8e2ef] bg-white px-4 py-2 text-sm text-[#625a70] hover:bg-[#f7f4fc]"
          >
            Sign out
          </button>
        </header>

        <div className="space-y-6 p-4 md:p-7">
          {dataLoading && (
            <p className="mb-4 text-sm text-[#716a7d]">
              Loading inventory from Supabase...
            </p>
          )}
          {dataError && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              Unable to load inventory: {dataError}
            </div>
          )}
          {/* SECTION 13 - PRODUCTS PAGE */}
          {activeNav === "Products" && (
            <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Products</h2>
                  <p className="mt-1 text-sm text-[#817b8c]">
                    Manage individual jewellery designs
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductError("");
                    setProductMessage("");
                    setShowProductForm(true);
                  }}
                  className="rounded-lg bg-[#5934c5] px-4 py-2 text-sm font-medium text-white"
                >
                  + Add Product
                </button>
              </div>

              {productMessage && (
                <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {productMessage}
                </p>
              )}

              {productError && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {productError}
                </p>
              )}

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search name or SKU..."
                  className="rounded-lg border border-[#e5dfed] px-3 py-2 text-sm"
                />

                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="rounded-lg border border-[#e5dfed] bg-white px-3 py-2 text-sm"
                >
                  <option>All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {productMessage && (
                <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {productMessage}
                </p>
              )}

              {productError && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {productError}
                </p>
              )}

              {showProductForm && (
                <form
                  onSubmit={saveProduct}
                  className="mb-6 grid gap-4 rounded-xl border p-4 sm:grid-cols-2"
                >
                  <label className="text-sm">
                    SKU / Code *
                    <input
                      name="sku"
                      required
                      placeholder="ER-001"
                      className="mt-1 w-full rounded-lg border p-2"
                    />
                  </label>

                  <label className="text-sm">
                    Product name *
                    <input
                      name="name"
                      required
                      placeholder="Pearl Jhumka"
                      className="mt-1 w-full rounded-lg border p-2"
                    />
                  </label>

                  <label className="text-sm">
                    Category *
                    <select
                      name="category_id"
                      required
                      className="mt-1 w-full rounded-lg border bg-white p-2"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    Variant / Description
                    <input
                      name="variant"
                      placeholder="White pearls, medium"
                      className="mt-1 w-full rounded-lg border p-2"
                    />
                  </label>

                  <label className="text-sm">
                    Low-stock threshold
                    <input
                      name="minimum_stock"
                      type="number"
                      min="0"
                      defaultValue="5"
                      required
                      className="mt-1 w-full rounded-lg border p-2"
                    />
                  </label>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-[#5934c5] px-4 py-2 text-white"
                    >
                      Save Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="rounded-lg border px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {productLoading ? (
                <p className="py-8 text-center text-sm text-[#817b8c]">
                  Loading products...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-162.5 text-left text-sm">
                    <thead className="bg-[#f7f4fb] text-[#716a7d]">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Minimum</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {products
                        .filter((p) =>
                          `${p.name} ${p.sku}`
                            .toLowerCase()
                            .includes(productSearch.toLowerCase()),
                        )
                        .filter(
                          (p) =>
                            productCategory === "All Categories" ||
                            p.category_id === productCategory,
                        )
                        .map((p) => (
                          <tr key={p.id} className="border-b border-[#f0edf4]">
                            <td className="p-3 font-medium">{p.sku}</td>
                            <td className="p-3">
                              {p.name}
                              {p.variant && (
                                <div className="mt-1 text-xs text-[#817b8c]">
                                  {p.variant}
                                </div>
                              )}
                            </td>
                            <td className="p-3">{p.categories?.name ?? "—"}</td>
                            <td className="p-3">{p.stock_quantity}</td>
                            <td className="p-3">{p.minimum_stock}</td>

                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProductError("");
                                    setProductMessage("");
                                    setShowProductForm(true);
                                  }}
                                  className="font-medium text-[#5934c5]"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteProduct(p)}
                                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {/* SECTION: CATEGORIES PAGE */}
          {activeNav === "Categories" && (
            <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Categories</h2>
                  <p className="mt-1 text-sm text-[#817b8c]">
                    Manage your jewellery categories
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt("Enter the new category name:");
                    if (name === null || !name.trim()) return;

                    async function addCategory() {
                      const { error } = await supabase
                        .from("categories")
                        .insert({ name: name.trim() });

                      if (error) {
                        window.alert(
                          error.code === "23505"
                            ? "This category already exists."
                            : error.message,
                        );
                        return;
                      }

                      setInventoryRefresh((value) => value + 1);
                      window.alert("Category added successfully.");
                    }

                    addCategory();
                  }}
                  className="rounded-lg bg-[#5934c5] px-4 py-2 text-sm font-medium text-white"
                >
                  + Add Category
                </button>
              </div>

              {dataLoading ? (
                <p className="py-8 text-center text-sm text-[#817b8c]">
                  Loading categories...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f7f4fb] text-[#716a7d]">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">Designs</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categories.map((category) => (
                        <tr
                          key={category.id}
                          className="border-b border-[#f0edf4]"
                        >
                          <td className="p-3 font-medium">{category.name}</td>
                          <td className="p-3">
                            {
                              products.filter(
                                (product) =>
                                  product.category_id === category.id,
                              ).length
                            }
                          </td>
                          <td className="p-3">
                            {products
                              .filter(
                                (product) =>
                                  product.category_id === category.id,
                              )
                              .reduce(
                                (total, product) =>
                                  total + Number(product.stock_quantity || 0),
                                0,
                              )}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={async () => {
                                const newName = window.prompt(
                                  "Rename category:",
                                  category.name,
                                );

                                if (
                                  newName === null ||
                                  !newName.trim() ||
                                  newName.trim() === category.name
                                ) {
                                  return;
                                }

                                const { error } = await supabase
                                  .from("categories")
                                  .update({ name: newName.trim() })
                                  .eq("id", category.id);

                                if (error) {
                                  window.alert(
                                    error.code === "23505"
                                      ? "A category with this name already exists."
                                      : error.message,
                                  );
                                  return;
                                }

                                setInventoryRefresh((value) => value + 1);
                                window.alert("Category renamed successfully.");
                              }}
                              className="font-medium text-[#5934c5]"
                            >
                              Rename
                            </button>
                          </td>
                        </tr>
                      ))}

                      {categories.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-[#817b8c]"
                          >
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {/* SECTION 14 - STOCK IN AND STOCK OUT PAGES */}
          {(activeNav === "Stock In (Purchase)" ||
            activeNav === "Stock Out (Sales)") && (
            <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
              <h2 className="mb-2 text-lg font-bold">
                {activeNav === "Stock In (Purchase)"
                  ? "Stock In — Record Purchase"
                  : "Stock Out — Record Sale"}
              </h2>

              <p className="mb-5 text-sm text-[#817b8c]">
                Select a product and enter the quantity.
              </p>

              {stockMessage && (
                <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {stockMessage}
                </p>
              )}

              {stockError && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {stockError}
                </p>
              )}

              <form
                onSubmit={submitStockTransaction}
                className="max-w-xl space-y-4"
              >
                <label className="block text-sm font-medium">
                  Category *
                  <select
                    value={stockCategory}
                    onChange={(e) => setStockCategory(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border bg-white p-3"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Product *
                  <select
                    key={stockCategory}
                    name="product_id"
                    required
                    defaultValue=""
                    disabled={!stockCategory}
                    className="mt-1 w-full rounded-lg border bg-white p-3 disabled:bg-gray-100"
                  >
                    <option value="" disabled>
                      {stockCategory
                        ? "Select a product"
                        : "Select a category first"}
                    </option>

                    {products
                      .filter((p) => p.category_id === stockCategory)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Stock: {p.stock_quantity}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Quantity *
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="mt-1 w-full rounded-lg border p-3"
                    placeholder="Enter quantity"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Bill or reference number
                  <input
                    name="reference"
                    className="mt-1 w-full rounded-lg border p-3"
                    placeholder="Optional"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Note
                  <textarea
                    name="note"
                    rows={2}
                    className="mt-1 w-full rounded-lg border p-3"
                    placeholder="Optional details"
                  />
                </label>

                <button
                  type="submit"
                  disabled={stockSaving}
                  className="rounded-lg bg-[#5934c5] px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  {stockSaving
                    ? "Saving..."
                    : activeNav === "Stock In (Purchase)"
                      ? "Confirm Purchase"
                      : "Confirm Sale"}
                </button>
              </form>
            </section>
          )}
          {/* SECTION: STOCK ADJUSTMENT PAGE */}
          {activeNav === "Stock Adjustment" && (
            <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
              <h2 className="mb-2 text-lg font-bold">Stock Adjustment</h2>

              <p className="mb-5 text-sm text-[#817b8c]">
                Correct your inventory when the physical count differs from the
                app. Every adjustment is recorded in stock history.
              </p>

              {stockMessage && (
                <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  {stockMessage}
                </p>
              )}

              {stockError && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {stockError}
                </p>
              )}

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formElement = event.currentTarget;
                  setStockError("");
                  setStockMessage("");

                  const form = new FormData(event.currentTarget);
                  const productId = String(form.get("product_id") || "");
                  const type = String(form.get("adjustment_type") || "");
                  const quantity = Number(form.get("quantity"));
                  const note = String(form.get("note") || "").trim();

                  if (
                    !productId ||
                    !["adjustment_in", "adjustment_out"].includes(type)
                  ) {
                    setStockError("Select a product and adjustment type.");
                    return;
                  }

                  if (!Number.isInteger(quantity) || quantity <= 0) {
                    setStockError("Quantity must be a positive whole number.");
                    return;
                  }

                  setStockSaving(true);

                  try {
                    const { error } = await supabase
                      .from("stock_transactions")
                      .insert({
                        product_id: productId,
                        transaction_type: type,
                        quantity,
                        note: note || "Manual stock adjustment",
                      });

                    if (error) throw error;

                    setStockMessage("Stock adjustment recorded successfully.");
                    formElement.reset();
                    setStockCategory("");
                    await loadProducts();
                    setInventoryRefresh((value) => value + 1);
                  } catch (error) {
                    setStockError(error.message || "Unable to adjust stock.");
                  } finally {
                    setStockSaving(false);
                  }
                }}
                className="max-w-xl space-y-4"
              >
                <label className="block text-sm font-medium">
                  Category *
                  <select
                    value={stockCategory}
                    onChange={(event) => setStockCategory(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border bg-white p-3"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Product *
                  <select
                    key={stockCategory}
                    name="product_id"
                    required
                    defaultValue=""
                    disabled={!stockCategory}
                    className="mt-1 w-full rounded-lg border bg-white p-3 disabled:bg-gray-100"
                  >
                    <option value="" disabled>
                      {stockCategory
                        ? "Select a product"
                        : "Select a category first"}
                    </option>
                    {products
                      .filter(
                        (product) => product.category_id === stockCategory,
                      )
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku}) — Stock:{" "}
                          {product.stock_quantity}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Adjustment type *
                  <select
                    name="adjustment_type"
                    required
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border bg-white p-3"
                  >
                    <option value="" disabled>
                      Select adjustment type
                    </option>
                    <option value="adjustment_in">Add missing stock (+)</option>
                    <option value="adjustment_out">
                      Remove excess stock (−)
                    </option>
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Quantity *
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="mt-1 w-full rounded-lg border p-3"
                    placeholder="Enter quantity to adjust"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Reason for adjustment *
                  <textarea
                    name="note"
                    required
                    rows={3}
                    className="mt-1 w-full rounded-lg border p-3"
                    placeholder="e.g. Physical count, damaged pieces, stock correction"
                  />
                </label>

                <button
                  type="submit"
                  disabled={stockSaving}
                  className="rounded-lg bg-[#5934c5] px-5 py-3 font-medium text-white disabled:opacity-50"
                >
                  {stockSaving ? "Saving..." : "Confirm Adjustment"}
                </button>
              </form>
            </section>
          )}

          {/* SECTION - STOCK HISTORY PAGE */}
          {activeNav === "Stock History" && (
            <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
              <h2 className="mb-2 text-lg font-bold">Stock History</h2>
              <p className="mb-5 text-sm text-[#817b8c]">
                Track all purchases, sales, and stock adjustments.
              </p>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Search product, SKU, reference or reason..."
                  id="history-search"
                  className="w-full rounded-lg border p-3"
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                  }}
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
              </div>

              {historyLoading ? (
                <p className="py-8 text-center text-[#817b8c]">
                  Loading stock history...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-187.5 text-left text-sm">
                    <thead className="bg-[#f8f6fb] text-[#625b70]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Transaction</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Reference / Reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stockHistory
                        .filter((item) => {
                          const matchesType =
                            historyFilter === "all" ||
                            item.transaction_type === historyFilter;

                          const search = historySearch.toLowerCase();

                          const matchesSearch = [
                            item.products?.name,
                            item.products?.sku,
                            item.products?.categories?.name,
                            item.reference,
                            item.note,
                            item.transaction_type,
                          ].some((value) =>
                            String(value ?? "")
                              .toLowerCase()
                              .includes(search),
                          );

                          return matchesType && matchesSearch;
                        })
                        .map((item) => {
                          const typeLabels = {
                            purchase: "Purchase",
                            sale: "Sale",
                            adjustment_in: "Stock added",
                            adjustment_out: "Stock removed",
                          };

                          const isAddition = [
                            "purchase",
                            "adjustment_in",
                          ].includes(item.transaction_type);

                          return (
                            <tr key={item.id} className="border-t">
                              <td className="whitespace-nowrap p-3">
                                {new Date(item.created_at).toLocaleString(
                                  "en-IN",
                                )}
                              </td>

                              <td className="p-3">
                                <div className="font-medium">
                                  {item.products?.name || "Unknown product"}
                                </div>
                                <div className="text-xs text-[#817b8c]">
                                  {item.products?.sku || "—"}
                                </div>
                              </td>

                              <td className="p-3">
                                {item.products?.categories?.name || "—"}
                              </td>

                              <td className="p-3">
                                {typeLabels[item.transaction_type] ||
                                  item.transaction_type}
                              </td>

                              <td className="p-3">
                                <span
                                  className={
                                    isAddition
                                      ? "font-semibold text-green-700"
                                      : "font-semibold text-red-600"
                                  }
                                >
                                  {isAddition ? "+" : "−"}
                                  {item.quantity}
                                </span>
                              </td>

                              <td className="max-w-xs whitespace-normal p-3">
                                <div>{item.reference || "—"}</div>
                                {item.note && (
                                  <div className="mt-1 text-xs text-[#817b8c]">
                                    {item.note}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                      {!historyLoading &&
                        stockHistory.filter((item) => {
                          const matchesType =
                            historyFilter === "all" ||
                            item.transaction_type === historyFilter;

                          const search = historySearch.toLowerCase();

                          const matchesSearch = [
                            item.products?.name,
                            item.products?.sku,
                            item.products?.categories?.name,
                            item.reference,
                            item.note,
                            item.transaction_type,
                          ].some((value) =>
                            String(value ?? "")
                              .toLowerCase()
                              .includes(search),
                          );

                          return matchesType && matchesSearch;
                        }).length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-8 text-center text-[#817b8c]"
                            >
                              No matching stock transactions found.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* SECTION - REPORTS DASHBOARD */}
          {activeNav === "Reports" && (
            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold">Inventory Reports</h2>
                  <p className="mt-1 text-sm text-[#817b8c]">
                    Understand your stock and inventory movement.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadCSV(
                        "jewellery-products.csv",
                        reportData.products.map((product) => ({
                          SKU: product.sku,
                          Product: product.name,
                          Category: product.categories?.name || "",
                          "Current Stock": product.stock_quantity,
                          "Minimum Stock": product.minimum_stock,
                          Active: product.active ? "Yes" : "No",
                        })),
                      )
                    }
                    className="rounded-lg border border-[#5934c5] px-4 py-2 text-sm font-medium text-[#5934c5]"
                  >
                    Export Products CSV
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadCSV(
                        "jewellery-stock-history.csv",
                        reportData.transactions.map((transaction) => {
                          const product = reportData.products.find(
                            (item) => item.id === transaction.product_id,
                          );

                          return {
                            Date: new Date(
                              transaction.created_at,
                            ).toLocaleString("en-IN"),
                            SKU: product?.sku || "",
                            Product: product?.name || "Unknown product",
                            Type: transaction.transaction_type,
                            Quantity: transaction.quantity,
                            Reference: transaction.reference || "",
                            Note: transaction.note || "",
                          };
                        }),
                      )
                    }
                    className="rounded-lg border border-[#5934c5] px-4 py-2 text-sm font-medium text-[#5934c5]"
                  >
                    Export Stock History CSV
                  </button>

                  <select
                    value={reportPeriod}
                    onChange={(event) => setReportPeriod(event.target.value)}
                    className="rounded-lg border border-[#ebe7f0] bg-white p-3"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                  </select>
                </div>
              </div>

              {reportLoading ? (
                <div className="rounded-xl border bg-white p-8 text-center text-[#817b8c]">
                  Loading reports...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Active Designs",
                        value: reportSummary.totalDesigns,
                        description: "Active product records",
                      },
                      {
                        label: "Current Stock",
                        value: reportSummary.totalStock,
                        description: "Pieces currently available",
                      },
                      {
                        label: "Purchased",
                        value: reportSummary.purchaseQuantity,
                        description: "Pieces purchased in selected period",
                      },
                      {
                        label: "Sold",
                        value: reportSummary.salesQuantity,
                        description: "Pieces sold in selected period",
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="rounded-xl border border-[#ebe7f0] bg-white p-5"
                      >
                        <p className="text-sm text-[#817b8c]">{card.label}</p>
                        <p className="mt-2 text-3xl font-bold">
                          {card.value.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-2 text-xs text-[#817b8c]">
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                      <h3 className="mb-4 font-bold">Category-wise Stock</h3>

                      {reportSummary.categories.length === 0 ? (
                        <p className="text-sm text-[#817b8c]">
                          No active products found.
                        </p>
                      ) : (
                        <div className="space-y-5">
                          {reportSummary.categories.map((category) => {
                            const maxStock = Math.max(
                              ...reportSummary.categories.map(
                                (item) => item.stock,
                              ),
                              1,
                            );

                            return (
                              <div key={category.name}>
                                <div className="mb-2 flex justify-between gap-3 text-sm">
                                  <span className="font-medium">
                                    {category.name}
                                  </span>
                                  <span className="text-[#817b8c]">
                                    {category.stock} pieces · {category.designs}{" "}
                                    designs
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-[#eeeaf5]">
                                  <div
                                    className="h-full rounded-full bg-[#5934c5]"
                                    style={{
                                      width: `${(category.stock / maxStock) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                      <h3 className="mb-4 font-bold">Stock Overview</h3>

                      <div className="space-y-4">
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-sm text-[#817b8c]">
                            Low-stock designs
                          </span>
                          <span className="font-bold text-amber-700">
                            {reportSummary.lowStockCount}
                          </span>
                        </div>

                        <div className="flex justify-between border-b pb-3">
                          <span className="text-sm text-[#817b8c]">
                            Stock added by adjustment
                          </span>
                          <span className="font-bold text-green-700">
                            +{reportSummary.adjustmentIn}
                          </span>
                        </div>

                        <div className="flex justify-between border-b pb-3">
                          <span className="text-sm text-[#817b8c]">
                            Stock removed by adjustment
                          </span>
                          <span className="font-bold text-red-600">
                            −{reportSummary.adjustmentOut}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-[#817b8c]">
                            Transactions in period
                          </span>
                          <span className="font-bold">
                            {reportSummary.transactionCount}
                          </span>
                        </div>
                      </div>

                      <p className="mt-5 text-xs text-[#817b8c]">
                        Current stock and low-stock counts reflect active
                        products. Purchase, sales and adjustment totals use the
                        selected period.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                    <h3 className="mb-4 font-bold">Low-Stock Products</h3>

                    {reportSummary.lowStockProducts.length === 0 ? (
                      <p className="text-sm text-[#817b8c]">
                        No active products are at or below their minimum stock
                        level.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-125 text-left text-sm">
                          <thead className="bg-[#f8f6fb]">
                            <tr>
                              <th className="p-3">Product</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Current Stock</th>
                              <th className="p-3">Minimum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportSummary.lowStockProducts.map((product) => (
                              <tr key={product.id} className="border-t">
                                <td className="p-3">
                                  <div className="font-medium">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-[#817b8c]">
                                    {product.sku}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {product.categories?.name || "—"}
                                </td>
                                <td className="p-3 font-semibold text-amber-700">
                                  {product.stock_quantity}
                                </td>
                                <td className="p-3">{product.minimum_stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* SECTION - LOW STOCK ALERTS */}
          {activeNav === "Low Stock Alerts" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Low Stock Alerts</h2>
                <p className="mt-1 text-sm text-[#817b8c]">
                  Products that need replenishment.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm text-amber-800">
                    Products needing attention
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">
                    {
                      reportData.products.filter(
                        (product) =>
                          Number(product.stock_quantity || 0) <=
                          Number(product.minimum_stock || 0),
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                  <p className="text-sm text-[#817b8c]">Out of stock</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">
                    {
                      reportData.products.filter(
                        (product) => Number(product.stock_quantity || 0) === 0,
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                  <p className="text-sm text-[#817b8c]">Low-stock pieces</p>
                  <p className="mt-2 text-3xl font-bold">
                    {reportData.products
                      .filter(
                        (product) =>
                          Number(product.stock_quantity || 0) <=
                          Number(product.minimum_stock || 0),
                      )
                      .reduce(
                        (sum, product) =>
                          sum + Number(product.stock_quantity || 0),
                        0,
                      )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                <h3 className="mb-4 font-bold">Products to Replenish</h3>

                {reportData.products.filter(
                  (product) =>
                    Number(product.stock_quantity || 0) <=
                    Number(product.minimum_stock || 0),
                ).length === 0 ? (
                  <div className="rounded-lg bg-green-50 p-5 text-sm text-green-800">
                    All active products are above their minimum stock levels.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-137.5 text-left text-sm">
                      <thead className="bg-[#f8f6fb]">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Current Stock</th>
                          <th className="p-3">Minimum Stock</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {reportData.products
                          .filter(
                            (product) =>
                              Number(product.stock_quantity || 0) <=
                              Number(product.minimum_stock || 0),
                          )
                          .sort(
                            (a, b) =>
                              Number(a.stock_quantity || 0) -
                              Number(b.stock_quantity || 0),
                          )
                          .map((product) => {
                            const outOfStock =
                              Number(product.stock_quantity || 0) === 0;

                            return (
                              <tr key={product.id} className="border-t">
                                <td className="p-3">
                                  <div className="font-medium">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-[#817b8c]">
                                    {product.sku}
                                  </div>
                                </td>

                                <td className="p-3">
                                  {product.categories?.name || "—"}
                                </td>

                                <td className="p-3 font-semibold">
                                  {product.stock_quantity}
                                </td>

                                <td className="p-3">{product.minimum_stock}</td>

                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                      outOfStock
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {outOfStock ? "Out of stock" : "Low stock"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SECTION 15 - DASHBOARD SUMMARY CARDS */}
          {activeNav === "Dashboard" && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Total Purchased",
                    value: totalPurchased,
                    icon: "□",
                    color: "bg-[#f0eaff] text-[#6139c8]",
                  },
                  {
                    title: "Total Sold",
                    value: totalSold,
                    icon: "↗",
                    color: "bg-[#e8f9ed] text-[#1c9b51]",
                  },
                  {
                    title: "Current Stock",
                    value: totalStock,
                    icon: "▦",
                    color: "bg-[#eaf2ff] text-[#3978d5]",
                  },
                  {
                    title: "Low Stock Categories",
                    value: lowStock.length,
                    icon: "!",
                    color: "bg-[#fff0e5] text-[#e76c28]",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.title}
                    className="flex items-center gap-4 rounded-xl border border-[#ebe7f0] bg-white p-5"
                  >
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl ${kpi.color}`}
                    >
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="text-sm text-[#797383]">{kpi.title}</p>
                      <p className="mt-1 text-2xl font-bold">
                        {kpi.value.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </section>

              <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_310px]">
                {/* SECTION 16 - CATEGORY INVENTORY CARDS */}
                <section className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">
                        {activeNav === "Low Stock Alerts"
                          ? "Categories Needing Restock"
                          : "Stock by Category"}
                      </h2>
                      <p className="mt-1 text-sm text-[#817b8c]">
                        Select a category to see its details
                      </p>
                    </div>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="max-w-full rounded-lg border border-[#e5dfed] bg-white px-3 py-2 text-sm"
                    >
                      <option>All Categories</option>
                      {categories.map((c) => (
                        <option key={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search jewellery categories..."
                    className="mb-4 w-full rounded-lg border border-[#e5dfed] bg-white px-4 py-3 text-sm outline-none focus:border-[#8b6ce0]"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(showAll
                      ? visibleCategories
                      : visibleCategories.slice(0, 9)
                    ).map((c) => {
                      const isLow = c.stock <= c.min;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setSelected(c)}
                          className="rounded-xl border border-[#ebe7f0] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#c9b9f5] hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f4efff] text-2xl text-[#6944cf]">
                              {c.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{c.name}</p>
                              <p
                                className={`mt-1 text-lg font-bold ${isLow ? "text-[#e6672c]" : "text-[#17944a]"}`}
                              >
                                {c.stock}{" "}
                                <span className="text-xs font-normal">pcs</span>
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2 border-t border-[#f0edf4] pt-3 text-sm">
                            <div className="flex justify-between text-[#797383]">
                              Purchased{" "}
                              <span className="font-medium text-[#282332]">
                                {c.purchased}
                              </span>
                            </div>
                            <div className="flex justify-between text-[#797383]">
                              Sold{" "}
                              <span className="font-medium text-[#282332]">
                                {c.sold}
                              </span>
                            </div>
                            <div className="flex justify-between text-[#797383]">
                              Designs{" "}
                              <span className="font-medium text-[#282332]">
                                {c.designs}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span
                              className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${
                                isLow
                                  ? "bg-[#fff0e5] text-[#d85a24]"
                                  : "bg-[#e8f9ed] text-[#178744]"
                              }`}
                            >
                              {isLow ? "Low Stock" : "Good Stock"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {visibleCategories.length > 9 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="mt-4 w-full rounded-lg border border-[#cfc0fa] bg-white py-3 text-sm font-medium text-[#5934c5] hover:bg-[#f7f3ff]"
                    >
                      {showAll
                        ? "Show Less"
                        : `View All ${visibleCategories.length} Categories`}
                    </button>
                  )}
                  {visibleCategories.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#d9d1e4] bg-white p-8 text-center text-sm text-[#817b8c]">
                      No categories found. Try another search.
                    </div>
                  )}
                </section>
                {/* SECTION 17 - LOW STOCK ALERTS */}
                <aside className="space-y-5">
                  <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h2 className="font-bold">Low Stock Alerts</h2>
                      <button
                        onClick={() => setActiveNav("Low Stock Alerts")}
                        className="text-xs font-medium text-[#6038c8]"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4">
                      {lowStock.slice(0, 5).map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setSelected(c)}
                          className="flex w-full items-center justify-between gap-2 text-left text-sm"
                        >
                          <span className="truncate">
                            {c.icon} &nbsp; {c.name}
                          </span>
                          <span className="shrink-0 rounded-md bg-[#fff0e5] px-2 py-1 text-xs text-[#d85a24]">
                            {c.stock} pcs
                          </span>
                        </button>
                      ))}
                      {lowStock.length === 0 && (
                        <p className="text-sm text-[#817b8c]">
                          No low-stock categories.
                        </p>
                      )}
                    </div>
                  </section>
                  {/* SECTION 18 - RECENT ACTIVITY */}
                  <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-bold">Recent Activity</h2>
                      <span className="text-xs text-[#817b8c]">
                        Sample data
                      </span>
                    </div>
                    <div className="space-y-4">
                      {activities.map((a, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                              a.type === "sale"
                                ? "bg-[#fff0ed] text-[#d95343]"
                                : "bg-[#e8f9ed] text-[#198b48]"
                            }`}
                          >
                            {a.type === "sale" ? "↑" : "↓"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p>{a.action}</p>
                            <p className="mt-1 text-xs text-[#817b8c]">
                              {a.ref}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#817b8c]">
                            {a.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* SECTION 19 - QUICK ACTIONS */}
                  <section className="rounded-xl border border-[#ebe7f0] bg-white p-5">
                    <h2 className="mb-4 font-bold">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActiveNav("Stock In (Purchase)")}
                        className="rounded-lg bg-[#e8f9ed] p-3 text-sm text-[#178744] hover:brightness-95"
                      >
                        <span className="mb-1 block text-xl">＋</span>Add
                        Purchase
                      </button>
                      <button
                        onClick={() => setActiveNav("Stock Out (Sales)")}
                        className="rounded-lg bg-[#fff0ed] p-3 text-sm text-[#d95343] hover:brightness-95"
                      >
                        <span className="mb-1 block text-xl">↗</span>Add Sale
                      </button>
                      <button
                        onClick={() => setActiveNav("Products")}
                        className="rounded-lg bg-[#f0eaff] p-3 text-sm text-[#6038c8] hover:brightness-95"
                      >
                        <span className="mb-1 block text-xl">□</span>Products
                      </button>
                      <button
                        onClick={() => setActiveNav("Reports")}
                        className="rounded-lg bg-[#eaf2ff] p-3 text-sm text-[#3978d5] hover:brightness-95"
                      >
                        <span className="mb-1 block text-xl">▥</span>Reports
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
          <p className="pb-3 text-center text-xs text-[#91899c]">
            Jewellery Inventory · Development Preview · Sample data only
          </p>
        </div>
      </main>
      {/* SECTION 20 - CATEGORY DETAILS MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#17121f80] p-4"
          onClick={() => setSelected(null)}
        >
          <section
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-[#817b8c]">Category details</p>
                <h2 className="mt-1 text-2xl font-bold">{selected.name}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-1 text-2xl text-[#817b8c] hover:bg-[#f4f0fa]"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Current Stock", selected.stock],
                ["Purchased", selected.purchased],
                ["Sold", selected.sold],
                ["Designs", selected.designs],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f7f4fb] p-4">
                  <p className="text-sm text-[#817b8c]">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-[#817b8c]">
              Minimum stock target: {selected.min} pcs
            </p>
            <p className="mt-4 rounded-lg bg-[#fff7eb] p-3 text-xs leading-relaxed text-[#8a6333]">
              This is currently a UI prototype. Stock edits in this preview are
              temporary. We will connect the database before using real business
              inventory.
            </p>
            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-lg bg-[#5934c5] py-3 font-medium text-white hover:bg-[#4825ac]"
            >
              Close Details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

// SECTION 21 - LOGIN AND AUTHENTICATION

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) setError(error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f9f8fc]">
        <p className="text-sm text-[#716a7d]">Checking your session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4fc] p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl border border-[#ebe7f0] bg-white p-8 shadow-sm"
        >
          <div className="mb-7 text-center">
            <div className="mb-3 text-5xl text-[#6944cf]">♢</div>
            <h1 className="text-2xl font-bold text-[#261a45]">
              ARJ Inventory
            </h1>
            <p className="mt-2 text-sm text-[#817b8c]">
              Sign in to manage your inventory
            </p>
          </div>

          <label className="mb-2 block text-sm font-medium">
            Email address
          </label>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[#e5dfed] px-4 py-3 outline-none focus:border-[#7854db]"
            placeholder="you@example.com"
          />

          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#e5dfed] px-4 py-3 outline-none focus:border-[#7854db]"
            placeholder="Enter your password"
          />

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-[#5934c5] py-3 font-medium text-white hover:bg-[#4825ac] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-5 text-center text-xs text-[#817b8c]">
            Access is restricted to authorized accounts.
          </p>
        </form>
      </main>
    );
  }

  return <InventoryDashboard onSignOut={handleSignOut} />;
}

export default App;
