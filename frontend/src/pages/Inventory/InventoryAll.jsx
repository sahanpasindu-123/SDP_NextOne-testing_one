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

import styles from "./InventoryAll.module.css";
import toast from "react-hot-toast";

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

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const tabs = useMemo(() => {
    const baseTabs = [{ label: "All", value: "all" }];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const dynamicTabs = safeCategories.map((c) => ({
      label: c.Name,
      value: String(c.CategoryID),
    }));
    return baseTabs.concat(dynamicTabs);
  }, [categories]);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const [pRes, cRes] = await Promise.all([
          productsAPI.getProducts(),
          productsAPI.getCategories(),
        ]);

        let categoriesData = [];
        if (cRes?.success && cRes?.data) {
          categoriesData = cRes.data;
        } else if (Array.isArray(cRes)) {
          categoriesData = cRes;
        } else {
          categoriesData = cRes?.data || [];
        }

        if (!isMountedRef.current) return;
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        let productsData = [];
        if (pRes?.success && pRes?.data) {
          productsData = pRes.data;
        } else if (Array.isArray(pRes)) {
          productsData = pRes;
        } else {
          productsData = pRes?.data || [];
        }

        const safeProducts = Array.isArray(productsData) ? productsData : [];
        const mappedItems = safeProducts.map((p) => {
          const stock = Number(p.Stock ?? 0);
          const stockLimit = Number(p.StockLimit ?? 0);

          let status = "In Stock";
          if (stock === 0) {
            status = "Out of Stock";
          } else if (stock <= stockLimit) {
            status = "Low Stock";
          }

          return {
            id: p.ProductID,
            name: p.Name || "Unknown Product",
            categoryId: p.CategoryID,
            category: p.CategoryName || p.category?.Name || "Uncategorized",
            productCode: p.ProductCode || "N/A",
            stock,
            price: `Rs ${Number(p.Price || 0).toLocaleString()}`,
            status,
            raw: p,
          };
        });

        if (!isMountedRef.current) return;
        setItems(mappedItems);
        setError(null);
      } catch (err) {
        console.error("[Inventory] Error fetching products/categories:", err);
        if (isMountedRef.current) {
          setError("Failed to load products/categories");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    const interval = setInterval(() => {
      fetchAll().catch((err) => console.error("poll inventory failed:", err));
    }, POLL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleDelete = (row) => navigate(`${base}/inventory/delete/${row.id}`);

  const handleAddSubmit = async (data) => {
    try {
      const fd = new FormData();
      fd.append("productName", data.productName);
      fd.append("categoryId", String(data.categoryId));
      fd.append("price", data.price);
      fd.append("stockQty", data.stockQty);
      fd.append("minQty", data.minQty);
      fd.append("desc", data.desc || "");

      if (data.imageFile) {
        fd.append("image", data.imageFile);
      }

      await productRequestsAPI.createRequest(fd);

      if (!isMountedRef.current) return;
      setAddOpen(false);
      toast.success("Product request sent to Admin (Pending approval)");
    } catch (e) {
      console.error("createRequest failed:", e);
      console.log("URL:", e?.config?.url);
      console.log("STATUS:", e?.response?.status);
      console.log("DATA:", e?.response?.data);
      console.log("MSG:", e?.message);
      toast.error("Failed to submit product request");
    }
  };

  const cols = [
    { key: "name", header: "Item Name" },
    { key: "category", header: "Category", width: 160 },
    { key: "productCode", header: "Product ID", width: 140 },
    { key: "stock", header: "Stock", width: 110 },
    { key: "price", header: "Price", width: 120 },
    {
      key: "status",
      header: "Status",
      width: 140,
      render: (r) =>
        r.status === "Low Stock" ? (
          <Badge tone="danger">Low Stock</Badge>
        ) : r.status === "Out of Stock" ? (
          <Badge tone="danger">Out of Stock</Badge>
        ) : (
          <Badge tone="success">In Stock</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 180,
      render: () => <span style={{ opacity: 0.7 }}>N/A</span>,
    },
  ];

  const handleToolbarFilter = () => {
    setStockFilter((prev) => (prev === "all" ? "low" : prev === "low" ? "out" : "all"));
  };

  const exportToCSV = (rows) => {
    const header = "ProductID,ProductCode,Name,Category,Stock,Price,Status";
    const body = rows
      .map((r) =>
        [
          r.id,
          `"${String(r.productCode).replaceAll('"', '""')}"`,
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
    toast.success("Exported: inventory-export.csv");
  };

  const filtered = useMemo(() => {
    let list =
      tab === "all"
        ? items
        : items.filter((i) => String(i.categoryId) === String(tab));

    if (stockFilter === "low") {
      list = list.filter((i) => i.status === "Low Stock");
    }

    if (stockFilter === "out") {
      list = list.filter((i) => i.status === "Out of Stock");
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          String(i.name).toLowerCase().includes(q) ||
          String(i.category).toLowerCase().includes(q) ||
          String(i.productCode).toLowerCase().includes(q)
      );
    }

    return list;
  }, [tab, items, stockFilter, searchTerm]);

  const totalItems = items.length;
  const lowStockCount = items.filter((x) => x.status === "Low Stock").length;
  const outOfStockCount = items.filter((x) => x.status === "Out of Stock").length;

  return (
    <div className={styles.page}>
      <div className="pageTitle">Manage Inventory</div>

      <div className={styles.blockTitle}>
        <div className={styles.sub}>Manage and track your JCB spare parts inventory.</div>
      </div>

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.leftBtns}>
          <Button
            leftIcon={<FiPlus />}
            onClick={() => {
              setAddOpen(true);
            }}
          >
            {isEmployeePortal ? "Request Product" : "Add New Item"}
          </Button>

          <Button variant="secondary" leftIcon={<FiFilter />} onClick={handleToolbarFilter}>
            Filter
          </Button>

          <Button variant="secondary" leftIcon={<FiDownload />} onClick={handleToolbarExport}>
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

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading && <div className={styles.infoText}>Loading inventory...</div>}
      {error && <div className={styles.errorText}>{error}</div>}

      <div className={styles.stats}>
        <StatCard
          label="Total Items"
          value={String(totalItems)}
          icon={<span style={{ fontWeight: 900 }}>*</span>}
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
          icon={<span style={{ fontWeight: 900 }}>Del</span>}
          iconTone="red"
        />
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Inventory Items</div>
        <Table columns={cols} rows={filtered} />
      </div>

      <AddNewProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        categories={categories}
        title={isEmployeePortal ? "Request Product" : "Add New Product"}
        submitLabel={isEmployeePortal ? "Submit Request" : "Add Item"}
        showProductCode={!isEmployeePortal}
        requireProductCode={!isEmployeePortal}
      />
    </div>
  );
}
