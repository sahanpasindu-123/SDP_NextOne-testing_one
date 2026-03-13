import { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  FiBarChart2,
  FiPieChart,
  FiTrendingUp,
  FiFilter,
  FiDownload,
  FiCalendar,
} from "react-icons/fi";
import { reportsAPI } from "../../api/reports";
import { productsAPI } from "../../api/products";
import styles from "./ReportsInventory.module.css";
import toast from "react-hot-toast";

const chips = ["Today", "This Week", "This Month", "Last 3 Months", "Custom"];
const COLORS = ["var(--accent)", "var(--accent-2)", "var(--red)", "var(--orange)", "var(--green)", "var(--blue)"];

const escapeCsvCell = (v) => {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function ReportsInventory() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [range, setRange] = useState("This Month");

  const [stats, setStats] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchInventoryReport();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchInventoryReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const fetchInventoryReport = async () => {
    const requestId = (requestIdRef.current += 1);
    try {
      setLoading(true);
      let payload = {};
      try {
        const invRes = await reportsAPI.getInventoryReport({ range });
        payload = invRes?.data ?? {};
      } catch (err) {
        console.error(err);
        toast.error("Failed to load inventory report");
        payload = {};
      }

      const rawStats = payload?.stats || {};

      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setStats([
        {
          title: "Total Items",
          value: rawStats.totalItems ?? 0,
          metaLeft: "Across all categories",
          metaRight: "In Stock",
        },
        {
          title: "Low Stock",
          value: rawStats.lowStock ?? 0,
          metaLeft: "Needs reordering",
          metaRight: "Below Minimum",
        },
        {
          title: "Inventory Value",
          value: `Rs ${Number(rawStats.inventoryValue || 0).toLocaleString()}`,
          metaLeft: "At selling price",
          metaRight: "Current Stock",
        },
      ]);

      setPieData(Array.isArray(payload?.pieData) ? payload.pieData : []);

      try {
        const productsRes = await productsAPI.getProducts();
        const list =
          Array.isArray(productsRes?.data)
            ? productsRes.data
            : Array.isArray(productsRes)
              ? productsRes
              : [];

        if (!isMountedRef.current || requestId !== requestIdRef.current) return;
        setItems(
          list.map((p) => ({
            productId: p?.ProductID ?? p?.productId ?? p?.id ?? "N/A",
            productName: p?.Name ?? p?.productName ?? p?.name ?? "N/A",
            CategoryCode:
              p?.CategoryCode ?? p?.categoryCode ?? p?.Category?.CategoryCode ?? "—",
            stockQuantity: Number(p?.Stock ?? p?.stockQuantity ?? p?.stock ?? 0) || 0,
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load inventory items");
        if (isMountedRef.current && requestId === requestIdRef.current) setItems([]);
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setStats([]);
        setPieData([]);
        setItems([]);
      }
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    if (!items.length) {
      toast("No data available to export");
      return;
    }

    const header = ["Product ID", "Product Name", "Category Code", "Stock Quantity"];
    const body = items
      .map((r) =>
        [r.productId, r.productName, r.CategoryCode, r.stockQuantity]
          .map(escapeCsvCell)
          .join(",")
      )
      .join("\n");

    downloadFile(
      `${header.join(",")}\n${body}`,
      "inventory-report.csv",
      "text/csv;charset=utf-8"
    );
    toast.success("Exported: inventory-report.csv");
  };

  const handleFilterClick = () => {
    fetchInventoryReport();
  };

  return (
    <div className={styles.page}>
      <div className="pageTitle">Reports</div>
      <div className="pageSub">View and generate reports for your inventory and sales data.</div>

      <div className={`card ${styles.topCard}`}>
        <div className={styles.tabs}>
          <NavLink
            to={`${base}/reports/sales`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            <FiBarChart2 /> Sales Report
          </NavLink>

          <NavLink
            to={`${base}/reports/inventory`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            <FiPieChart /> Inventory Report
          </NavLink>

          <NavLink
            to={`${base}/reports/performance`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            <FiTrendingUp /> Performance
          </NavLink>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.outlineBtn}
            type="button"
            onClick={handleFilterClick}
            disabled={loading}
          >
            <FiFilter /> Filter
          </button>

          <button
            className={styles.yellowBtn}
            type="button"
            onClick={handleExportReport}
            disabled={loading}
          >
            <FiDownload /> Export Report
          </button>
        </div>
      </div>

      <div className={`card ${styles.rangeRow}`}>
        <div className={styles.rangeLeft}>
          <FiCalendar />
          <span className={styles.rangeLabel}>Date Range:</span>
        </div>

        <div className={styles.chips}>
          {chips.map(c => (
            <button
              key={c}
              onClick={() => setRange(c)}
              className={`${styles.chip} ${
                range === c ? styles.chipActive : ""
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        {loading && !stats.length ? (
          <div style={{ padding: 12, color: "#6b7280", fontWeight: 800 }}>
            Loading inventory report...
          </div>
        ) : null}
        {stats.map(s => (
          <div key={s.title} className={styles.statCard}>
            <div className={styles.statTop}>
              <div className={styles.statTitle}>{s.title}</div>
              <div className={styles.statMetaRight}>{s.metaRight}</div>
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statMetaLeft}>{s.metaLeft}</div>
          </div>
        ))}
      </div>

        <div className={styles.grid2}>
          <div className={styles.box}>
            <div className={styles.boxTitle}>Inventory by Category</div>

            {loading && !pieData.length ? (
              <div style={{ padding: 16, color: "#6b7280", fontWeight: 800 }}>
                Loading chart...
              </div>
            ) : pieData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: 16, color: "#6b7280", fontWeight: 800 }}>
                No data available
              </div>
            )}
          </div>

          <div className={styles.box}>
            <div className={styles.boxTitle}>Inventory Items</div>

            <div className={styles.table}>
              <div className={styles.tHead}>
                <div>Product ID</div>
                <div>Product</div>
                <div>Category</div>
                <div>Stock</div>
              </div>

              {loading && !items.length ? (
                <div className={styles.tRow}>
                  <div style={{ gridColumn: "1 / -1", color: "#6b7280", fontWeight: 800 }}>
                    Loading items...
                  </div>
                </div>
              ) : !items.length ? (
                <div className={styles.tRow}>
                  <div style={{ gridColumn: "1 / -1", color: "#6b7280", fontWeight: 800 }}>
                    No data available
                  </div>
                </div>
              ) : null}

              {items.map((m, idx) => (
                <div key={idx} className={styles.tRow}>
                  <div>{m.productId}</div>
                  <div>{m.productName}</div>
                  <div>{m.CategoryCode}</div>
                  <div>{m.stockQuantity}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
