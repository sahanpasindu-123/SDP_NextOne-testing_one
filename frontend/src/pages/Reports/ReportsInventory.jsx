import { useEffect, useMemo, useState } from "react";
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
import styles from "./ReportsInventory.module.css";

const chips = ["Today", "This Week", "This Month", "Last 3 Months", "Custom"];
const COLORS = ["#E0AB00", "#4CE7FF", "#FF6B6B", "#FFD166", "#06D6A0", "#118AB2"];

export default function ReportsInventory() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const [range, setRange] = useState("This Month");

  const [stats, setStats] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryReport();
  }, []);

  const fetchInventoryReport = async () => {
    try {
const res = await reportsAPI.getInventoryReport();
setRows(res.data);
      const d = res.data.data;

      setStats([
        {
          title: "Total Items",
          value: d.stats.totalItems,
          metaLeft: "Across all categories",
          metaRight: "In Stock",
        },
        {
          title: "Low Stock",
          value: d.stats.lowStock,
          metaLeft: "Needs reordering",
          metaRight: "Below Minimum",
        },
        {
          title: "Inventory Value",
          value: `Rs ${Number(d.stats.inventoryValue).toLocaleString()}`,
          metaLeft: "At selling price",
          metaRight: "Current Stock",
        },
      ]);

      setPieData(d.pieData);
      setMovements(d.movements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    const header = "Date,Item,Type,Qty";
    const body = movements
      .map(m => `${m.date},${m.item},${m.type},${m.qty}`)
      .join("\n");

    downloadFile(`${header}\n${body}`, "inventory-report.csv", "text/csv");
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading inventory report...</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.h1}>Reports</div>
          <div className={styles.sub}>
            View and generate reports for your inventory and sales data.
          </div>
        </div>
      </div>

      <div className={styles.topCard}>
        <div className={styles.tabs}>
          <NavLink to={`${base}/reports/sales`} className={styles.tab}>
            <FiBarChart2 /> Sales Report
          </NavLink>

          <NavLink
            to={`${base}/reports/inventory`}
            className={`${styles.tab} ${styles.activeYellow}`}
          >
            <FiPieChart /> Inventory Report
          </NavLink>

          <NavLink to={`${base}/reports/performance`} className={styles.tab}>
            <FiTrendingUp /> Performance
          </NavLink>
        </div>

        <div className={styles.actions}>
          <button className={styles.outlineBtn} type="button">
            <FiFilter /> Filter
          </button>

          <button
            className={styles.yellowBtn}
            type="button"
            onClick={handleExportReport}
          >
            <FiDownload /> Export Report
          </button>
        </div>
      </div>

      <div className={styles.rangeRow}>
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
        </div>

        <div className={styles.box}>
          <div className={styles.boxTitle}>Recent Stock Movements</div>

          <div className={styles.table}>
            <div className={styles.tHead}>
              <div>Date</div>
              <div>Item</div>
              <div>Type</div>
              <div>Quantity</div>
            </div>

            {movements.map((m, idx) => (
              <div key={idx} className={styles.tRow}>
                <div>{m.date}</div>
                <div>{m.item}</div>
                <div>{m.type}</div>
                <div>{m.qty}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
