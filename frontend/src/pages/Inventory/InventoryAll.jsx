import { useMemo, useState, useEffect, useRef } from "react";
import { FiPlus, FiFilter, FiDownload, FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

import { productsAPI } from "../../api/products";
import { productRequestsAPI } from "../../api/productRequests";

import StatCard from "../../components/StatCard/StatCard.jsx";
import Tabs from "../../components/Tabs/Tabs.jsx";
import Table from "../../components/Table/Table.jsx";
import Button from "../../components/Button/Button.jsx";
import Badge from "../../components/Badge/Badge.jsx";

import AddNewProductModal from "../../components/modals/Inventory/AddNewProductModal.jsx";
import UpdateProductModal from "../../components/modals/Inventory/UpdateProductModal.jsx";
import AddProductImageModal from "../../components/modals/Inventory/AddProductImageModal.jsx";

import styles from "./InventoryAll.module.css";

export default function InventoryAll() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const isEmployeePortal = base === "/employee";
  const POLL_MS = 10000;

  const [tab, setTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out
  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); // ✅ objects from DB
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ React 18 StrictMode mounts effects twice in DEV.
  // Guard to avoid creating duplicate polling intervals / duplicate request storms.
  const didStartPollingRef = useRef(false);

  // ✅ Dynamic tabs from DB categories
  const tabs = useMemo(() => {
    const baseTabs = [{ label: "All", value: "all" }];
    const dynamicTabs = (categories || []).map((c) => ({
      label: c.Name,
      value: String(c.CategoryID), // tab value = CategoryID
    }));
    return baseTabs.concat(dynamicTabs);
  }, [categories]);

  // ✅ Load products + categories
  useEffect(() => {
    if (didStartPollingRef.current) return;
    didStartPollingRef.current = true;

    const fetchAll = async () => {
      try {
        setLoading(true);
        console.log("🔍 [Inventory] Fetching products and categories");

        const [pRes, cRes] = await Promise.all([
          productsAPI.getProducts(),
          productsAPI.getCategories(),
        ]);

        console.log("✅ [Inventory] Products response:", pRes);
        console.log("✅ [Inventory] Categories response:", cRes);

        // Handle categories response format
        let categoriesData = [];
        if (cRes?.success && cRes?.data) {
          categoriesData = cRes.data;
        } else if (Array.isArray(cRes)) {
          categoriesData = cRes;
        } else {
          categoriesData = cRes?.data || [];
        }

        setCategories(categoriesData);

        // Handle products response format
        let productsData = [];
        if (pRes?.success && pRes?.data) {
          productsData = pRes.data;
        } else if (Array.isArray(pRes)) {
          productsData = pRes;
        } else {
          productsData = pRes?.data || [];
        }

        // Products mapping (align with your backend)
        const mappedItems = productsData.map((p) => ({
          id: p.ProductID,
          name: p.Name || "Unknown Product",
          categoryId: p.CategoryID,
          category: p.CategoryName || p.category?.Name || "Uncategorized",
          sku: String(p.ProductID),
          stock: Number(p.Stock ?? 0),
          price: `Rs ${Number(p.Price || 0).toLocaleString()}`,
          status: Number(p.Stock ?? 0) <= Number(p.StockLimit ?? 0) ? "Low Stock" : "In Stock",
          raw: p,
        }));

        console.log("✅ [Inventory] Mapped items:", mappedItems);
        setItems(mappedItems);
        setError(null);
      } catch (err) {
        console.error("❌ [Inventory] Error fetching products/categories:", err);
        setError("Failed to load products/categories");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    const interval = setInterval(() => {
      fetchAll().catch((err) => console.error("poll inventory failed:", err));
    }, POLL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = (row) => navigate(`${base}/inventory/delete/${row.sku}`);

  const handleUpdateOpen = (row) => {
    setSelectedProduct(row.raw);
    setUpdateOpen(true);
  };

  const handleImageOpen = (row) => {
    setSelectedProduct(row.raw);
    setImageOpen(true);
  };

  // ✅ EMPLOYEE: Add product -> Send request to admin (PENDING)
  const handleAddSubmit = async (data) => {
    try {
      const fd = new FormData();
      fd.append("productName", data.productName);
      fd.append("categoryId", String(data.categoryId)); // ✅ required
      fd.append("price", data.price);
      fd.append("stockQty", data.stockQty);
      fd.append("minQty", data.minQty);
      fd.append("desc", data.desc || "");
      if (data.imageFile) fd.append("image", data.imageFile);

      await productRequestsAPI.createRequest(fd);

      setAddOpen(false);
      alert("Product request sent to Admin ✅ (Pending approval)");
    } catch (e) {
      console.error("createRequest failed:", e);
      alert("Failed to submit product request (check backend / token)");
      console.error("createRequest failed:", e);
      console.log("URL:", e?.config?.url);
      console.log("STATUS:", e?.response?.status);
      console.log("DATA:", e?.response?.data);
      console.log("MSG:", e?.message);
      alert("Failed to submit product request (check console)");
    }
  };

  // (Optional) If you want employee updates also pending, we can do later.
  const handleUpdateSubmit = (data) => {
    console.log("Update Product:", { id: selectedProduct?.ProductID, data });
    setUpdateOpen(false);
  };

  const handleImageSubmit = (file) => {
    console.log("Add Image:", { productId: selectedProduct?.ProductID, file });
    setImageOpen(false);
  };

  const cols = [
    { key: "name", header: "Item Name" },
    { key: "category", header: "Category", width: 160 },
    { key: "sku", header: "SKU", width: 140 },
    { key: "stock", header: "Stock", width: 110 },
    { key: "price", header: "Price", width: 120 },
    {
      key: "status",
      header: "Status",
      width: 140,
      render: (r) =>
        r.status === "Low Stock" ? (
          <Badge tone="danger">Low Stock</Badge>
        ) : (
          <Badge tone="success">In Stock</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 180,
      render: (r) => (
        isEmployeePortal ? (
          <span style={{ opacity: 0.7 }}>—</span>
        ) : (
        <div className={styles.actions}>
          <button
            className={`${styles.iconBtn} ${styles.edit}`}
            aria-label="Edit"
            onClick={() => handleUpdateOpen(r)}
          >
            <FiEdit2 />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.trash}`}
            aria-label="Delete"
            onClick={() => handleDelete(r)}
          >
            <FiTrash2 />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.image}`}
            aria-label="Add Image"
            onClick={() => handleImageOpen(r)}
          >
            📷
          </button>
        </div>
        )
      ),
    },
  ];

  // ---------------- Toolbar actions (implemented) ----------------
  const handleToolbarFilter = () => {
    // cycle: all -> low -> out -> all
    setStockFilter((p) => (p === "all" ? "low" : p === "low" ? "out" : "all"));
  };

  const exportToCSV = (rows) => {
    const header = "ProductID,Name,Category,Stock,Price,Status";
    const body = rows
      .map((r) =>
        [
          r.id,
          `"${String(r.name).replaceAll('"', '""')}"`,
          `"${String(r.category).replaceAll('"', '""')}"`,
          r.stock,
          `"${String(r.price).replaceAll('"', '""')}"`,
          r.status,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToolbarExport = () => {
    exportToCSV(filtered);
    alert("Exported: inventory-export.csv");
  };

  const stockFilterLabel =
    stockFilter === "all" ? "Filter" : stockFilter === "low" ? "Low Stock" : "Out of Stock";


  // ✅ Filter by CategoryID (tab value)
  // ✅ Filter by CategoryID (tab) + stockFilter + searchTerm
  const filtered = useMemo(() => {
    let list = tab === "all" ? items : items.filter((i) => String(i.categoryId) === String(tab));

    if (stockFilter === "low") list = list.filter((i) => i.status === "Low Stock");
    if (stockFilter === "out") list = list.filter((i) => (i.raw?.Stock ?? 0) === 0);

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          String(i.name).toLowerCase().includes(q) ||
          String(i.category).toLowerCase().includes(q) ||
          String(i.sku).toLowerCase().includes(q)
      );
    }

    return list;
  }, [tab, items, stockFilter, searchTerm]);


  const totalItems = items.length;
  const lowStockCount = items.filter((x) => x.status === "Low Stock").length;
  const outOfStockCount = items.filter((x) => (x.raw?.Stock ?? 0) === 0).length;

  return (
    <div className={styles.page}>
      <div className="pageTitle">Manage Inventory</div>

      <div className={styles.blockTitle}>
        <div className={styles.h1}>Inventory Management</div>
        <div className={styles.sub}>Manage and track your JCB spare parts inventory.</div>
      </div>

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.leftBtns}>
          <Button leftIcon={<FiPlus />} onClick={() => setAddOpen(true)}>
            {isEmployeePortal ? "Request Product" : "Add New Item"}
          </Button>
          <Button variant="secondary" leftIcon={<FiFilter />}>
            Filter
          </Button>
          <Button variant="secondary" leftIcon={<FiDownload />}>
            Export
          </Button>
        </div>

        <div className={styles.search}>
          <FiSearch className={styles.sIcon} />
          <input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ✅ Dynamic tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className={styles.stats}>
        <StatCard
          label="Total Items"
          value={String(totalItems)}
          icon={<span style={{ fontWeight: 900 }}>⬣</span>}
          iconTone="purple"
        />
        <StatCard
          label="Low Stock Items"
          value={String(lowStockCount)}
          icon={<span style={{ fontWeight: 900 }}>!</span>}
          iconTone="accent"
        />
        <StatCard
          label="Out of Stock"
          value={String(outOfStockCount)}
          icon={<span style={{ fontWeight: 900 }}>🗑</span>}
          iconTone="red"
        />
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Inventory Items</div>
        <Table columns={cols} rows={filtered} />
      </div>

      {/* ✅ Employee add -> PENDING request */}
      <AddNewProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        categories={categories} // ✅ objects from DB
        title={isEmployeePortal ? "Request Product" : "Add New Product"}
        submitLabel={isEmployeePortal ? "Submit Request" : "Add Item"}
      />

      <UpdateProductModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onSubmit={handleUpdateSubmit}
        categories={categories.map((c) => c.Name)}
        initial={{
          name: selectedProduct?.Name,
          sku: selectedProduct?.ProductID,
          category: selectedProduct?.category?.Name || selectedProduct?.CategoryName,
          stock: selectedProduct?.Stock,
          price: selectedProduct?.Price,
          desc: selectedProduct?.Description,
          minQty: selectedProduct?.StockLimit,
        }}
      />

      <AddProductImageModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </div>
  );
}
