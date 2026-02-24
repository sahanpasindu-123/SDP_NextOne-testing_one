import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import Badge from "../../../components/Badge/Badge.jsx";
import Table from "../../../components/Table/Table.jsx";
import styles from "./AdminPending.module.css";
import { productRequestsAPI } from "../../../api/productRequests";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function AdminPending() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await productRequestsAPI.list("PENDING");

      if (!Array.isArray(res?.data)) {
        throw new Error("Invalid server response");
      }

      setRows(res.data);
    } catch (err) {
      console.error("load product requests failed:", err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load product requests";

      setRows([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchPending();

  const t = setInterval(() => {
    fetchPending();
  }, 5000); // 5 seconds

  return () => clearInterval(t);
}, []);


  const handleApprove = async (r) => {
    if (!window.confirm(`Approve request #${r.RequestID}?`)) return;

    try {
      setBusyId(r.RequestID);
      await productRequestsAPI.approve(r.RequestID);
      await fetchPending();
      alert(`Approved request #${r.RequestID}`);
    } catch (err) {
      console.error("approve failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Approve failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r) => {
    if (!window.confirm(`Reject request #${r.RequestID}?`)) return;

    try {
      setBusyId(r.RequestID);
      await productRequestsAPI.reject(r.RequestID);
      await fetchPending();
      alert(`Rejected request #${r.RequestID}`);
    } catch (err) {
      console.error("reject failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Reject failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const cols = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        width: 90,
        render: (r) => <span className={styles.id}>#{r.RequestID}</span>,
      },
      { key: "Name", header: "Product" },
      {
        key: "Category",
        header: "Category",
        width: 160,
        render: (r) => r.category?.Name || "—",
      },
      {
        key: "Price",
        header: "Price",
        width: 120,
        render: (r) => `Rs ${Number(r.Price || 0).toLocaleString()}`,
      },
      { key: "Stock", header: "Stock", width: 90 },
      {
        key: "RequestedBy",
        header: "Requested By",
        width: 180,
        render: (r) =>
          r.employee?.name ||
          r.employee?.employeeId ||
          "—",
      },
      {
        key: "CreatedAt",
        header: "Requested At",
        width: 190,
        render: (r) => formatDate(r.CreatedAt),
      },
      {
        key: "Status",
        header: "Status",
        width: 140,
        render: (r) => (
          <Badge tone="warn">
            {String(r.Status || "PENDING")}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: 160,
        render: (r) => (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.aBtn} ${styles.ok}`}
              aria-label="Approve"
              onClick={() => handleApprove(r)}
              disabled={busyId === r.RequestID}
            >
              <FiCheck />
            </button>

            <button
              type="button"
              className={`${styles.aBtn} ${styles.no}`}
              aria-label="Reject"
              onClick={() => handleReject(r)}
              disabled={busyId === r.RequestID}
            >
              <FiX />
            </button>
          </div>
        ),
      },
    ],
    [busyId]
  );

  return (
    <div className={styles.page}>
      <div className="pageTitle">Product Requests</div>
      <div className="pageSub">
        Approve or reject pending product add requests.
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Pending Requests</div>

        {loading && (
          <div style={{ padding: 16, opacity: 0.8 }}>
            Loading…
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: 16,
              color: "#b91c1c",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <Table columns={cols} rows={rows} />
        )}
      </div>
    </div>
  );
}
