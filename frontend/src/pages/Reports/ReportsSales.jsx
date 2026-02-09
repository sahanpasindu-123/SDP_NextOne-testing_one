import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiDownload, FiFilter } from "react-icons/fi";
import Table from "../../components/Table/Table.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Button from "../../components/Button/Button.jsx";
import styles from "./ReportsSales.module.css";
import toast from "react-hot-toast";
import { reportsAPI } from "../../api/reports";

export default function ReportsSales() {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Fetch data ----------------
  useEffect(() => {
    fetchSalesReport();
  }, []);

  const fetchSalesReport = async () => {
    try {
const res = await reportsAPI.getSalesReport();
setRows(res.data);
      setRows(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sales report");
    } finally {
      setLoading(false);
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
    const header = "Invoice ID,Customer,Date,Amount,Status";
    const body = rows
      .map((r) => [r.id, r.customer, r.date, r.amount, r.status].join(","))
      .join("\n");

    downloadFile(`${header}\n${body}`, "sales-report.csv", "text/csv");
    toast.success("Exported: sales-report.csv");
  };

  const handleFilter = () => {
    toast("Filter UI not implemented yet");
  };

  if (loading) {
    return <div className={styles.page}>Loading sales report...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.h1}>Reports</div>
          <div className={styles.sub}>
            Generate and export reports for your inventory and sales data.
          </div>
        </div>
      </div>

      <div className={styles.topCard}>
        <div className={styles.tabs}>
          <NavLink
            to={`${base}/reports/sales`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.active : ""}`
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
          <Button leftIcon={<FiDownload />} onClick={handleExportReport}>
            Export Report
          </Button>

          <Button
            variant="secondary"
            leftIcon={<FiFilter />}
            onClick={handleFilter}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Sales</div>
        <Table columns={cols} rows={rows} />
      </div>
    </div>
  );
}
