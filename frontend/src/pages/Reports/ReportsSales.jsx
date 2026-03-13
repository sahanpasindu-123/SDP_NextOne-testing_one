import { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiDownload, FiFilter } from "react-icons/fi";
import Table from "../../components/Table/Table.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./ReportsSales.module.css";
import toast from "react-hot-toast";
import { reportsAPI } from "../../api/reports";

const toPaidPending = (raw) => {
  const s = String(raw || "").toUpperCase();
  if (s.includes("PAID") || s.includes("COMPLETE")) return "Paid";
  if (s.includes("PEND")) return "Pending";
  return raw ? String(raw) : "UNKNOWN";
};

const escapeCsvCell = (v) => {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function ReportsSales() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Fetch data ----------------
  useEffect(() => {
    isMountedRef.current = true;
    fetchSalesReport();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSalesReport = async () => {
    const requestId = (requestIdRef.current += 1);
    try {
      setLoading(true);
      const res = await reportsAPI.getSalesReport();
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const mapped = data.map((r) => ({
        id: r?.id ?? "N/A",
        customer: r?.customer ?? "N/A",
        date: r?.date ?? "N/A",
        amount: r?.amount ?? "Rs 0",
        status: toPaidPending(r?.status),
      }));
      setRows(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sales report");
      if (isMountedRef.current && requestId === requestIdRef.current) setRows([]);
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // ---------------- Table columns ----------------
  const cols = [
    {
      key: "id",
      header: "Invoice ID",
      width: 110,
      render: (r) => <span className={styles.id}>{r.id}</span>,
    },
    { key: "customer", header: "Customer" },
    { key: "date", header: "Date", width: 160 },
    { key: "amount", header: "Amount", width: 140 },
    {
      key: "status",
      header: "Status",
      width: 140,
      render: (r) => (
        <Badge tone={r.status === "Paid" ? "success" : "warn"}>
          {r.status}
        </Badge>
      ),
    },
  ];

  // ---------------- Export ----------------
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
    if (!rows.length) {
      toast("No data available to export");
      return;
    }
    const header = "Invoice ID,Customer,Date,Amount,Status";
    const body = rows
      .map((r) =>
        [r.id, r.customer, r.date, r.amount, r.status]
          .map(escapeCsvCell)
          .join(",")
      )
      .join("\n");

    downloadFile(`${header}\n${body}`, "sales-report.csv", "text/csv");
    toast.success("Exported: sales-report.csv");
  };

  const handleFilter = () => {
    fetchSalesReport();
    toast("Filter applied");
  };

  return (
    <div className={styles.page}>
      <div className="pageTitle">Reports</div>
      <div className="pageSub">Generate and export reports for your inventory and sales data.</div>

      <div className={`card ${styles.topCard}`}>
        <div className={styles.tabs}>
          <NavLink
            to={`${base}/reports/sales`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            Sales Report
          </NavLink>

          <NavLink
            to={`${base}/reports/inventory`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            Inventory Report
          </NavLink>

          <NavLink
            to={`${base}/reports/performance`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.activeYellow : ""}`
            }
          >
            Performance
          </NavLink>
        </div>

        <div className={styles.actions}>
          <Button leftIcon={<FiDownload />} onClick={handleExportReport} disabled={loading}>
            Export Report
          </Button>

          <Button
            variant="secondary"
            leftIcon={<FiFilter />}
            onClick={handleFilter}
            disabled={loading}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Sales</div>
        {loading ? (
          <div style={{ padding: 14, color: "#6b7280", fontWeight: 800 }}>
            Loading sales report...
          </div>
        ) : !rows.length ? (
          <div style={{ padding: 14, color: "#6b7280", fontWeight: 800 }}>
            No data available
          </div>
        ) : null}
        <Table columns={cols} rows={rows} />
      </div>
    </div>
  );
}
