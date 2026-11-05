import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import StockOperations from "./StockOperations";

export default function OwnerDashboard({ onSignOut }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCogs, setTotalCogs] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [salesWithUnknownCost, setSalesWithUnknownCost] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    variant: "",
    minimum_stock: "0",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: "",
    quantity: "",
    total_cost: "",
    reference: "",
    note: "",
  });

  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  // SALES STATE
  const [saleForm, setSaleForm] = useState({
    product_id: "",
    quantity: "",
    total_amount: "",
    reference: "",
    note: "",
  });

  const [salesHistory, setSalesHistory] = useState([]);
  const [loadingSalesHistory, setLoadingSalesHistory] = useState(false);
  // EXPENSE MANAGEMENT STATE
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseMessage, setExpenseMessage] = useState("");
  const [expenseError, setExpenseError] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    category: "Rent",
    amount: "",
    expense_date: new Date().toLocaleDateString("en-CA"),
    payment_method: "Cash",
    description: "",
  });

  const expenseCategories = [
    "Rent",
    "Salary",
    "Electricity",
    "Transport",
    "Packaging",
    "Maintenance",
    "Marketing",
    "Bank Charges",
    "Other",
  ];
  // PROFIT & LOSS REPORT STATE
  const todayInIndia = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const [reportStartDate, setReportStartDate] = useState(
    `${todayInIndia.slice(0, 7)}-01`,
  );
  const [reportEndDate, setReportEndDate] = useState(todayInIndia);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const [saleMessage, setSaleMessage] = useState("");
  const [saleError, setSaleError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [productMessage, setProductMessage] = useState("");
  const [productError, setProductError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loadingProducts, setLoadingProducts] = useState(false);
  useEffect(() => {
    loadDashboardStats();
  }, []);
  useEffect(() => {
    if (
      activeTab === "Inventory" ||
      activeTab === "Categories" ||
      activeTab === "Purchases" ||
      activeTab === "Sales"
    ) {
      loadProducts();
    }

    if (activeTab === "Purchases") {
      loadPurchaseHistory();
    }
    if (activeTab === "Sales") {
      loadSalesHistory();
    }
    if (activeTab === "Expenses") {
      loadExpenses();
    }
    if (activeTab === "Reports") {
      loadProfitLossReport();
    }
  }, [activeTab, reportStartDate, reportEndDate, loadProfitLossReport]);

  async function loadProducts() {
    setLoadingProducts(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
        id,
        sku,
        name,
        variant,
        stock_quantity,
        purchase_cost,
        minimum_stock,
        active,
        category_id,
        categories(name)
      `,
        )
        .order("name")
        .eq("active", true);

      if (error) throw error;

      setProducts(data || []);
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (categoryError) throw categoryError;

      setCategories(categoryData || []);
    } catch (error) {
      console.error("Unable to load products:", error.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSaveProduct() {
    setProductError("");
    setProductMessage("");

    const minimumStock = Number(productForm.minimum_stock);

    if (!productForm.name.trim()) {
      setProductError("Product name is required.");
      return;
    }

    if (!productForm.category_id) {
      setProductError("Please select a category.");
      return;
    }

    if (!Number.isInteger(minimumStock) || minimumStock < 0) {
      setProductError(
        "Minimum stock must be a valid non-negative whole number.",
      );
      return;
    }

    setSavingProduct(true);

    try {
      if (editingProductId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: productForm.name.trim(),
            sku: productForm.sku.trim() || null,
            category_id: productForm.category_id,
            variant: productForm.variant.trim() || null,
            minimum_stock: minimumStock,
          })
          .eq("id", editingProductId);

        if (error) throw error;

        setProductMessage("Product updated successfully.");
      } else {
        const { error } = await supabase.from("products").insert({
          name: productForm.name.trim(),
          sku: productForm.sku.trim() || null,
          category_id: productForm.category_id,
          variant: productForm.variant.trim() || null,
          stock_quantity: 0,
          minimum_stock: minimumStock,
          active: true,
        });

        if (error) throw error;

        setProductMessage("Product added successfully.");
      }

      setProductForm({
        name: "",
        sku: "",
        category_id: "",
        variant: "",
        minimum_stock: "0",
      });

      setShowProductForm(false);
      setEditingProductId(null);

      await loadProducts();
      await loadDashboardStats();
    } catch (error) {
      setProductError(error.message || "Unable to save product.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${product.name}"?`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", product.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProducts();
    await loadDashboardStats();
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();

    setCategoryMessage("");
    setCategoryError("");

    if (!name) {
      setCategoryError("Please enter a category name.");
      return;
    }

    const { error } = await supabase.from("categories").insert([{ name }]);

    if (error) {
      setCategoryError(
        error.code === "23505"
          ? "This category already exists."
          : error.message,
      );
      return;
    }

    setNewCategoryName("");
    setCategoryMessage("Category added successfully.");

    await loadProducts();
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`,
    );

    if (!confirmed) return;

    setCategoryError("");
    setCategoryMessage("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setCategoryError(
        error.code === "23503"
          ? "Cannot delete this category because products are assigned to it."
          : error.message,
      );
      return;
    }

    setCategoryMessage("Category deleted successfully.");

    await loadProducts();
  }

  async function handleAddPurchase() {
    setPurchaseMessage("");
    setPurchaseError("");

    const quantity = Number(purchaseForm.quantity);
    const totalCost = Number(purchaseForm.total_cost);

    if (!purchaseForm.product_id) {
      setPurchaseError("Please select a product.");
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setPurchaseError("Enter a valid positive whole-number quantity.");
      return;
    }
    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      setPurchaseError("Enter a valid purchase amount greater than zero.");
      return;
    }
    setSavingPurchase(true);

    try {
      const { error } = await supabase.from("stock_transactions").insert({
        product_id: purchaseForm.product_id,
        transaction_type: "purchase",
        quantity,
        total_cost: totalCost,
        reference: purchaseForm.reference.trim() || null,
        note: purchaseForm.note.trim() || null,
      });

      if (error) throw error;

      setPurchaseForm({
        product_id: "",
        quantity: "",
        total_cost: "",
        reference: "",
        note: "",
      });

      setPurchaseMessage("Purchase recorded successfully.");

      await Promise.all([
        loadProducts(),
        loadDashboardStats(),
        loadPurchaseHistory(),
      ]);
    } catch (error) {
      setPurchaseError(error.message || "Unable to record purchase.");
    } finally {
      setSavingPurchase(false);
    }
  }

  // RECORD SALE
  async function handleAddSale() {
    setSaleMessage("");
    setSaleError("");

    const quantity = Number(saleForm.quantity);
    const totalAmount = Number(saleForm.total_amount);

    const selectedProduct = products.find(
      (product) => product.id === saleForm.product_id,
    );

    if (!selectedProduct) {
      setSaleError("Please select a product.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setSaleError("Enter a valid whole-number quantity.");
      return;
    }

    if (quantity > selectedProduct.stock_quantity) {
      setSaleError("Not enough stock available.");
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setSaleError("Enter a valid sale amount.");
      return;
    }

    setSavingSale(true);

    try {
      const { error } = await supabase.rpc("record_sale", {
        p_product_id: saleForm.product_id,
        p_quantity: quantity,
        p_total_amount: totalAmount,
        p_reference: saleForm.reference.trim() || null,
        p_note: saleForm.note.trim() || null,
      });

      if (error) throw error;

      setSaleMessage("Sale recorded successfully.");

      setSaleForm({
        product_id: "",
        quantity: "",
        total_amount: "",
        reference: "",
        note: "",
      });

      await loadProducts();
      await loadDashboardStats();
      await loadSalesHistory();
    } catch (err) {
      setSaleError(err.message || "Unable to record sale.");
    } finally {
      setSavingSale(false);
    }
  }

  async function loadPurchaseHistory() {
    setLoadingPurchaseHistory(true);

    try {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select(
          `
        id,
        created_at,
        quantity,
        total_cost,
        reference,
        note,
        products(name, sku)
        `,
        )
        .eq("transaction_type", "purchase")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPurchaseHistory(data || []);
    } catch (error) {
      console.error("Unable to load purchase history:", error.message);
      setPurchaseError(error.message);
    } finally {
      setLoadingPurchaseHistory(false);
    }
  }

  // LOAD SALES HISTORY WITH SELLER EMAIL
  async function loadSalesHistory() {
    setLoadingSalesHistory(true);
    setSaleError("");

    const { data, error } = await supabase.rpc("get_sales_history_with_email");

    if (error) {
      setSaleError("Unable to load sales history: " + error.message);
      setLoadingSalesHistory(false);
      return;
    }

    setSalesHistory(data || []);
    setLoadingSalesHistory(false);
  }
  // LOAD EXPENSE HISTORY
  async function loadExpenses() {
    setLoadingExpenses(true);
    setExpenseError("");

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      setExpenseError(error.message);
    } finally {
      setLoadingExpenses(false);
    }
  }
  // LOAD PROFIT & LOSS REPORT
  const loadProfitLossReport = useCallback(async () => {
    setReportLoading(true);
    setReportError("");

    try {
      const { data, error } = await supabase.rpc("get_profit_loss_report", {
        p_start_date: reportStartDate,
        p_end_date: reportEndDate,
      });

      if (error) throw error;

      setReportData(data?.[0] || null);
    } catch (error) {
      console.error("Unable to load Profit & Loss report:", error);
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  }, [reportStartDate, reportEndDate]);

  // SAVE OR UPDATE EXPENSE
  async function handleSaveExpense(e) {
    e.preventDefault();
    setExpenseMessage("");
    setExpenseError("");

    const amount = Number(expenseForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setExpenseError("Enter a valid amount greater than zero.");
      return;
    }

    if (!expenseForm.expense_date) {
      setExpenseError("Please select an expense date.");
      return;
    }

    setSavingExpense(true);

    try {
      const payload = {
        category: expenseForm.category,
        amount,
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method || null,
        description: expenseForm.description.trim() || null,
      };

      let error;

      if (editingExpenseId) {
        ({ error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingExpenseId));
      } else {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError) throw userError;

        ({ error } = await supabase.from("expenses").insert({
          ...payload,
          created_by: userData.user.id,
        }));
      }

      if (error) throw error;

      setExpenseMessage("Expense saved successfully.");
      setEditingExpenseId(null);

      setExpenseForm({
        category: "Rent",
        amount: "",
        expense_date: new Date().toLocaleDateString("en-CA"),
        payment_method: "Cash",
        description: "",
      });

      await loadExpenses();
    } catch (error) {
      setExpenseError(error.message);
    } finally {
      setSavingExpense(false);
    }
  }

  // EDIT EXPENSE
  function handleEditExpense(expense) {
    setEditingExpenseId(expense.id);

    setExpenseForm({
      category: expense.category,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || "Cash",
      description: expense.description || "",
    });
  }

  // DELETE EXPENSE
  async function handleDeleteExpense(expense) {
    const confirmed = window.confirm(
      `Delete this expense of ₹${expense.amount}?`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (error) {
      setExpenseError(error.message);
      return;
    }

    setExpenseMessage("Expense deleted successfully.");

    if (editingExpenseId === expense.id) {
      setEditingExpenseId(null);
    }

    await loadExpenses();
  }
  const inventoryValue = products.reduce((total, product) => {
    if (product.purchase_cost == null) return total;

    return (
      total + Number(product.stock_quantity) * Number(product.purchase_cost)
    );
  }, 0);

  const productsWithUnknownCost = products.filter(
    (product) => product.purchase_cost == null && product.stock_quantity > 0,
  ).length;
  const filteredProducts = products.filter((product) => {
    const searchTerm = productSearch.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm) ||
      product.categories?.name?.toLowerCase().includes(searchTerm);

    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  async function loadDashboardStats() {
    setLoadingStats(true);

    try {
      // 1. Load active products and stock quantities
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, stock_quantity, minimum_stock")
        .eq("active", true);

      if (productsError) throw productsError;

      const productList = products || [];

      setTotalProducts(productList.length);

      setTotalStock(
        productList.reduce(
          (total, product) => total + (product.stock_quantity || 0),
          0,
        ),
      );

      setLowStockCount(
        productList.filter(
          (product) => product.stock_quantity <= product.minimum_stock,
        ).length,
      );

      // 2. Calculate today's sales
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const startOfTomorrow = new Date(startOfDay);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("sold_at", startOfDay.toISOString())
        .lt("sold_at", startOfTomorrow.toISOString());

      if (salesError) throw salesError;

      setTodaySales(
        (sales || []).reduce(
          (total, sale) => total + Number(sale.total_amount || 0),
          0,
        ),
      );
      // 3. Calculate all-time sales, cost and gross profit
      const { data: allSales, error: allSalesError } = await supabase
        .from("sales")
        .select("total_amount, cost_of_goods_sold");

      if (allSalesError) throw allSalesError;

      const salesList = allSales || [];

      const knownCostSales = salesList.filter(
        (sale) => sale.cost_of_goods_sold != null,
      );

      const unknownCostCount = salesList.filter(
        (sale) => sale.cost_of_goods_sold == null,
      ).length;

      const salesTotal = salesList.reduce(
        (total, sale) => total + Number(sale.total_amount || 0),
        0,
      );

      const cogsTotal = knownCostSales.reduce(
        (total, sale) => total + Number(sale.cost_of_goods_sold),
        0,
      );

      const profitTotal = knownCostSales.reduce(
        (total, sale) =>
          total +
          Number(sale.total_amount || 0) -
          Number(sale.cost_of_goods_sold),
        0,
      );

      setTotalSales(salesTotal);
      setTotalCogs(cogsTotal);
      setGrossProfit(profitTotal);
      setSalesWithUnknownCost(unknownCostCount);
    } catch (error) {
      console.error("Dashboard loading error:", error.message);
    } finally {
      setLoadingStats(false);
    }
  }

  const menuItems = [
    { name: "Overview", icon: "◫" },
    { name: "Inventory", icon: "▦" },
    { name: "Categories", icon: "▤" },
    { name: "Purchases", icon: "↓" },
    { name: "Sales", icon: "↑" },
    { name: "Expenses", icon: "₹" },
    { name: "Stock History", icon: "◷" },
    { name: "Stock Adjustment", icon: "↻" },
    { name: "Reports", icon: "▥" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f6f7fb]">
      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#211b35] text-white md:flex">
        <div className="border-b border-white/10 px-6 py-7">
          <h1 className="text-xl font-bold tracking-wide">ARJ Inventory</h1>
          <p className="mt-1 text-xs text-white/50">Business Management</p>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-white/40">
            Main Menu
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeTab === item.name
                    ? "bg-[#7049d8] text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <button
            onClick={onSignOut}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#7049d8]">
              Owner Workspace
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {activeTab}
            </h2>
          </div>

          <button
            onClick={onSignOut}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 md:hidden"
          >
            Sign Out
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-800">Owner Account</p>
            <p className="text-xs text-gray-400">Full business access</p>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {activeTab === "Overview" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Business Overview
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Here's what's happening with your inventory today.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {/* TOTAL PRODUCTS */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Active Designs</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats ? "..." : totalProducts}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">Active products</p>
                </div>

                {/* TOTAL STOCK */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Available Stock</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats ? "..." : totalStock}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Total units available
                  </p>
                </div>

                {/* LOW STOCK */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Low Stock Items</p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {loadingStats ? "..." : lowStockCount}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    At or below minimum stock
                  </p>
                </div>

                {/* TODAY'S SALES */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Today's Sales</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats
                      ? "..."
                      : `₹${todaySales.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Total recorded sales
                  </p>
                </div>
                {/* ALL-TIME TOTAL SALES */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats
                      ? "..."
                      : `₹${totalSales.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    All-time recorded revenue
                  </p>
                </div>

                {/* COST OF GOODS SOLD */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Cost of Goods Sold</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats
                      ? "..."
                      : `₹${totalCogs.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Cost recorded for sold stock
                  </p>
                </div>

                {/* GROSS PROFIT */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Gross Profit</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingStats
                      ? "..."
                      : `₹${grossProfit.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Known-cost sales only
                    {salesWithUnknownCost > 0 &&
                      ` • ${salesWithUnknownCost} sales missing cost`}
                  </p>
                </div>

                {/* INVENTORY VALUE */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">Inventory Value</p>
                  <p className="mt-3 text-3xl font-bold text-gray-900">
                    {loadingProducts
                      ? "..."
                      : `₹${inventoryValue.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {productsWithUnknownCost} products with unknown cost
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === "Inventory" ? (
            <div className="space-y-6">
              {/* INVENTORY HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Product Inventory
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage and monitor all your products.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700">
                    {filteredProducts.length} Products
                  </span>

                  <button
                    onClick={() => {
                      setShowProductForm(true);
                      setProductMessage("");
                      setProductError("");
                    }}
                    className="rounded-xl bg-[#7049d8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5e39c2]"
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              {productMessage && (
                <p
                  role="status"
                  className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
                >
                  {productMessage}
                </p>
              )}

              {/* ADD PRODUCT FORM */}
              {showProductForm && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Add New Product
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Enter the product details below.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowProductForm(false)}
                      className="text-sm text-gray-500 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>

                  {productError && (
                    <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {productError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Product Name *
                      </label>
                      <input
                        value={productForm.name}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter product name"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        SKU
                      </label>
                      <input
                        value={productForm.sku}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            sku: e.target.value,
                          })
                        }
                        placeholder="Enter SKU"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Category *
                      </label>
                      <select
                        value={productForm.category_id}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            category_id: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Variant
                      </label>
                      <input
                        value={productForm.variant}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            variant: e.target.value,
                          })
                        }
                        placeholder="Optional variant"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Minimum Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={productForm.minimum_stock}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            minimum_stock: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowProductForm(false)}
                      className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600"
                    >
                      Cancel
                    </button>

                    <button
                      disabled={savingProduct}
                      onClick={handleSaveProduct}
                      className="rounded-xl bg-[#7049d8] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingProduct ? "Saving..." : "Save Product"}
                    </button>
                  </div>
                </div>
              )}

              {/* SEARCH AND FILTER */}
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product, SKU or category..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PRODUCT TABLE */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {loadingProducts ? (
                  <p className="p-8 text-center text-sm text-gray-500">
                    Loading products...
                  </p>
                ) : filteredProducts.length === 0 ? (
                  <p className="p-8 text-center text-sm text-gray-500">
                    No products found.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-4">Product</th>
                          <th className="px-5 py-4">SKU</th>
                          <th className="px-5 py-4">Category</th>
                          <th className="px-5 py-4">Stock</th>
                          <th className="px-5 py-4">Minimum</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-5 py-4 font-semibold text-gray-900">
                              {product.name}
                              {product.variant && (
                                <p className="mt-1 text-xs font-normal text-gray-400">
                                  {product.variant}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4 text-gray-500">
                              {product.sku || "—"}
                            </td>

                            <td className="px-5 py-4 text-gray-600">
                              {product.categories?.name || "—"}
                            </td>

                            <td className="px-5 py-4 font-semibold text-gray-900">
                              {product.stock_quantity}
                            </td>

                            <td className="px-5 py-4 text-gray-500">
                              {product.minimum_stock}
                            </td>

                            <td className="px-5 py-4">
                              {product.active ? (
                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                  Active
                                </span>
                              ) : (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => {
                                  setProductForm({
                                    name: product.name || "",
                                    sku: product.sku || "",
                                    category_id: product.category_id || "",
                                    variant: product.variant || "",
                                    minimum_stock: String(
                                      product.minimum_stock ?? 0,
                                    ),
                                  });

                                  setEditingProductId(product.id);
                                  setProductError("");
                                  setProductMessage("");
                                  setShowProductForm(true);
                                }}
                                className="rounded-lg border border-purple-200 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  console.log("Delete clicked:", product.name);
                                  handleDeleteProduct(product);
                                }}
                                className="ml-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "Categories" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Categories</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your product categories.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 font-semibold text-gray-900">
                  Add New Category
                </h4>

                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500"
                  />

                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    Add Category
                  </button>
                </div>

                {categoryError && (
                  <p className="mt-3 text-sm text-red-600">{categoryError}</p>
                )}

                {categoryMessage && (
                  <p className="mt-3 text-sm text-green-600">
                    {categoryMessage}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => {
                  const productCount = products.filter(
                    (product) => product.category_id === category.id,
                  ).length;

                  return (
                    <div
                      key={category.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <h4 className="font-semibold text-gray-900">
                        {category.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="mt-4 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete Category
                      </button>
                      <p className="mt-2 text-sm text-gray-500">
                        {productCount} products
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === "Purchases" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Purchases</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Record and manage your stock purchases.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h4 className="mb-5 font-semibold text-gray-900">
                  New Purchase
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <select
                    value={purchaseForm.product_id}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        product_id: e.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Quantity purchased"
                    value={purchaseForm.quantity}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        quantity: e.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Total purchase amount (₹)"
                    value={purchaseForm.total_cost}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        total_cost: e.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  />

                  <input
                    type="text"
                    placeholder="Supplier / Invoice reference (optional)"
                    value={purchaseForm.reference}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        reference: e.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  />

                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={purchaseForm.note}
                    onChange={(e) =>
                      setPurchaseForm({ ...purchaseForm, note: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPurchase}
                  disabled={savingPurchase}
                  className="mt-5 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {savingPurchase ? "Saving..." : "Record Purchase"}
                </button>

                {purchaseError && (
                  <p className="mt-3 text-sm text-red-600">{purchaseError}</p>
                )}

                {purchaseMessage && (
                  <p className="mt-3 text-sm text-green-600">
                    {purchaseMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 font-semibold text-gray-900">
                  Purchase History
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3 text-left">Total Cost</th>
                        <th className="px-4 py-3 text-left">Unit Cost</th>
                        <th className="px-4 py-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPurchaseHistory ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            Loading purchases...
                          </td>
                        </tr>
                      ) : purchaseHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No purchases recorded yet.
                          </td>
                        </tr>
                      ) : (
                        purchaseHistory.map((purchase) => (
                          <tr
                            key={purchase.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-3">
                              {new Date(purchase.created_at).toLocaleDateString(
                                "en-IN",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {purchase.products?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {purchase.products?.sku || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3">{purchase.quantity}</td>
                            <td className="px-4 py-3">
                              {purchase.total_cost == null
                                ? "—"
                                : `₹${Number(purchase.total_cost).toLocaleString("en-IN")}`}
                            </td>

                            <td className="px-4 py-3">
                              {purchase.total_cost == null
                                ? "—"
                                : `₹${(
                                    Number(purchase.total_cost) /
                                    Number(purchase.quantity)
                                  ).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`}
                            </td>
                            <td className="px-4 py-3">
                              {purchase.reference || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "Sales" ? (
            <div className="space-y-6">
              {/* RECORD NEW SALE */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Record New Sale
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSale();
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <select
                    value={saleForm.product_id}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, product_id: e.target.value })
                    }
                    className="w-full border rounded-lg p-3"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}) — Stock:{" "}
                        {product.stock_quantity}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Quantity"
                    value={saleForm.quantity}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, quantity: e.target.value })
                    }
                    className="w-full border rounded-lg p-3"
                    required
                  />

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Total Sale Amount (₹)"
                    value={saleForm.total_amount}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, total_amount: e.target.value })
                    }
                    className="w-full border rounded-lg p-3"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Reference / Bill Number (Optional)"
                    value={saleForm.reference}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, reference: e.target.value })
                    }
                    className="w-full border rounded-lg p-3"
                  />

                  <textarea
                    placeholder="Note (Optional)"
                    value={saleForm.note}
                    onChange={(e) =>
                      setSaleForm({ ...saleForm, note: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 md:col-span-2"
                    rows="2"
                  />

                  {saleError && (
                    <p className="text-sm text-red-600 md:col-span-2">
                      {saleError}
                    </p>
                  )}

                  {saleMessage && (
                    <p className="text-sm text-green-600 md:col-span-2">
                      {saleMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={savingSale}
                    className="bg-blue-600 text-white rounded-lg px-5 py-3 disabled:opacity-50 md:col-span-2"
                  >
                    {savingSale ? "Recording..." : "Record Sale"}
                  </button>
                </form>
              </div>

              {/* SALES HISTORY */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Sales History
                </h3>

                {loadingSalesHistory ? (
                  <p className="text-gray-500">Loading sales...</p>
                ) : salesHistory.length === 0 ? (
                  <p className="text-gray-500">No sales recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Quantity</th>
                          <th className="px-4 py-3">Sale Amount</th>
                          <th className="px-4 py-3">Cost</th>
                          <th className="px-4 py-3">Gross Profit</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Sold By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesHistory.map((sale) => (
                          <tr key={sale.id} className="border-b last:border-0">
                            <td className="px-4 py-3">
                              {new Date(sale.sold_at).toLocaleDateString(
                                "en-IN",
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {sale.products?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.products?.sku || ""}
                              </div>
                            </td>

                            <td className="px-4 py-3">{sale.quantity}</td>

                            <td className="px-4 py-3">
                              ₹
                              {Number(sale.total_amount).toLocaleString(
                                "en-IN",
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {sale.cost_of_goods_sold == null
                                ? "Unknown"
                                : `₹${Number(sale.cost_of_goods_sold).toLocaleString("en-IN")}`}
                            </td>

                            <td className="px-4 py-3 font-semibold">
                              {sale.gross_profit == null
                                ? "Unknown"
                                : `₹${Number(sale.gross_profit).toLocaleString("en-IN")}`}
                            </td>

                            <td className="px-4 py-3">
                              {sale.reference || "—"}
                            </td>

                            <td className="px-4 py-3 text-xs">
                              {sale.sold_by_email || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "Expenses" ? (
            <div className="space-y-6">
              {/* EXPENSES PAGE — ADD / EDIT FORM */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingExpenseId ? "Edit Expense" : "Add New Expense"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Record and manage your business expenses.
                  </p>
                </div>

                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            category: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        required
                      >
                        {expenseCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                        placeholder="Enter amount"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Expense Date
                      </label>
                      <input
                        type="date"
                        value={expenseForm.expense_date}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            expense_date: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Payment Method
                      </label>
                      <select
                        value={expenseForm.payment_method}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            payment_method: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional details about this expense"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  {expenseError && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {expenseError}
                    </p>
                  )}

                  {expenseMessage && (
                    <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {expenseMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingExpense}
                      className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingExpense
                        ? "Saving..."
                        : editingExpenseId
                          ? "Update Expense"
                          : "Save Expense"}
                    </button>

                    {editingExpenseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExpenseId(null);
                          setExpenseForm({
                            category: "Rent",
                            amount: "",
                            expense_date: new Date().toLocaleDateString(
                              "en-CA",
                            ),
                            payment_method: "Cash",
                            description: "",
                          });
                          setExpenseError("");
                          setExpenseMessage("");
                        }}
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* EXPENSE HISTORY */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Expense History
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    All recorded business expenses.
                  </p>
                </div>

                {loadingExpenses ? (
                  <div className="p-8 text-center text-gray-500">
                    Loading expenses...
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No expenses recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Description</th>
                          <th className="px-5 py-3">Payment</th>
                          <th className="px-5 py-3 text-right">Amount</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-5 py-4">
                              {expense.expense_date}
                            </td>
                            <td className="px-5 py-4 font-medium text-gray-900">
                              {expense.category}
                            </td>
                            <td className="px-5 py-4 text-gray-600">
                              {expense.description || "—"}
                            </td>
                            <td className="px-5 py-4 text-gray-600">
                              {expense.payment_method || "—"}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                              ₹
                              {Number(expense.amount).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleEditExpense(expense)}
                                className="mr-3 font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense)}
                                className="font-medium text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "Reports" ? (
            <div className="space-y-6">
              {/* PROFIT & LOSS REPORT */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Profit & Loss Report
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Financial performance for your selected period.
                  </p>
                </div>

                {/* DATE FILTERS */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      max={reportEndDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      min={reportStartDate}
                      max={todayInIndia}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    />
                  </div>
                </div>

                {reportLoading ? (
                  <p className="py-10 text-center text-gray-500">
                    Loading financial report...
                  </p>
                ) : reportError ? (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    {reportError}
                  </div>
                ) : reportData ? (
                  <>
                    {/* FINANCIAL SUMMARY */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">Total Sales</p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900">
                          ₹
                          {Number(reportData.total_sales).toLocaleString(
                            "en-IN",
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {reportData.sale_count} transactions
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">
                          Cost of Goods Sold
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900">
                          ₹
                          {Number(reportData.known_cogs).toLocaleString(
                            "en-IN",
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Known-cost sales only
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">Gross Profit</p>
                        <h3 className="mt-2 text-2xl font-bold text-green-700">
                          ₹
                          {Number(reportData.gross_profit).toLocaleString(
                            "en-IN",
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Known-cost sales only
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">Total Expenses</p>
                        <h3 className="mt-2 text-2xl font-bold text-red-600">
                          ₹
                          {Number(reportData.total_expenses).toLocaleString(
                            "en-IN",
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {reportData.expense_count} expense records
                        </p>
                      </div>

                      <div className="rounded-xl bg-purple-50 p-5">
                        <p className="text-sm text-purple-700">
                          Net Profit (Known-Cost Basis)
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-purple-800">
                          ₹
                          {Number(
                            reportData.net_profit_known_cost_basis,
                          ).toLocaleString("en-IN")}
                        </h3>
                        <p className="mt-1 text-xs text-purple-600">
                          Gross profit minus expenses
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-5">
                        <p className="text-sm text-gray-500">
                          Known-Cost Sales
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900">
                          ₹
                          {Number(reportData.known_cost_sales).toLocaleString(
                            "en-IN",
                          )}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Sales with recorded purchase cost
                        </p>
                      </div>
                    </div>

                    {/* UNKNOWN COST WARNING */}
                    {Number(reportData.unknown_cost_sales_count) > 0 && (
                      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <h3 className="font-semibold text-amber-800">
                          Some sales have unknown purchase costs
                        </h3>

                        <p className="mt-2 text-sm text-amber-700">
                          {reportData.unknown_cost_sales_count} sales worth ₹
                          {Number(
                            reportData.unknown_cost_sales_amount,
                          ).toLocaleString("en-IN")}{" "}
                          have no recorded cost.
                        </p>

                        <p className="mt-2 text-sm text-amber-700">
                          These sales are excluded from gross profit. Your net
                          profit is therefore incomplete and should not be
                          treated as final.
                        </p>
                      </div>
                    )}

                    {Number(reportData.unknown_cost_sales_count) === 0 && (
                      <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                        All sales in this period have recorded purchase costs.
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-10 text-center text-gray-500">
                    No report data available.
                  </p>
                )}
              </div>
            </div>
          ) : activeTab === "Stock History" ||
            activeTab === "Stock Adjustment" ? (
            <StockOperations
              activeTab={activeTab}
              onChanged={loadDashboardStats}
            />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">{activeTab}</h3>
              <p className="mt-2 text-sm text-gray-500">
                This section will be connected to your inventory system.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
