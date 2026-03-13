import { useEffect, useMemo, useState, useRef } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import Badge from "../../../components/Badge/Badge.jsx";
import Table from "../../../components/Table/Table.jsx";
import styles from "./AdminPending.module.css";
import { productRequestsAPI } from "../../../api/productRequests";
import toast from "react-hot-toast";
import Modal from "../../../components/Modal/Modal.jsx";
import Button from "../../../components/Button/Button.jsx";

function formatDate(iso) {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function AdminPending() {
  const isMountedRef = useRef(true);
  const pollRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve'|'reject', row }

  const fetchPending = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");

    try {
      const res = await productRequestsAPI.list("PENDING");

      if (!Array.isArray(res?.data)) {
        throw new Error("Invalid server response");
      }

      if (!isMountedRef.current) return;
      setRows(res.data);
    } catch (err) {
      console.error("load product requests failed:", err);

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load product requests";

      if (isMountedRef.current) {
        setRows([]);
        setError(msg);
      }
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        fetchPending({ silent: true });
      }, 5000); // 5 seconds
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPending();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopPolling();
    };
  }, []);


  const handleApprove = async (r) => {
    setConfirmAction({ type: "approve", row: r });
  };

  const confirmApprove = async (r) => {
    try {
      if (isMountedRef.current) {
        setBusyId(r.RequestID);
      }
      await productRequestsAPI.approve(r.RequestID);
      await fetchPending();
      toast.success(`Approved request #${r.RequestID}`);
    } catch (err) {
      console.error("approve failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Approve failed");
    } finally {
      if (isMountedRef.current) {
        setBusyId(null);
      }
    }
  };

  const handleReject = async (r) => {
    setConfirmAction({ type: "reject", row: r });
  };

  const confirmReject = async (r) => {
    try {
      if (isMountedRef.current) {
        setBusyId(r.RequestID);
      }
      await productRequestsAPI.reject(r.RequestID);
      await fetchPending();
      toast.success(`Rejected request #${r.RequestID}`);
    } catch (err) {
      console.error("reject failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Reject failed");
    } finally {
      if (isMountedRef.current) {
        setBusyId(null);
      }
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
        render: (r) => r.category?.Name || "N/A",
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
          "N/A",
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
            Loading...
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

      <Modal
        open={!!confirmAction}
        title={confirmAction?.type === "reject" ? "Reject Request" : "Approve Request"}
        onClose={() => setConfirmAction(null)}
        width={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            {confirmAction?.type === "reject" ? "Reject" : "Approve"} request{" "}
            <span style={{ fontWeight: 900 }}>#{confirmAction?.row?.RequestID}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {confirmAction?.row?.Name ? `Product: ${confirmAction.row.Name}` : "This action will update the request status."}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button
              variant="secondary"
              onClick={() => setConfirmAction(null)}
              disabled={busyId === confirmAction?.row?.RequestID}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const row = confirmAction?.row;
                if (!row) return;
                setConfirmAction(null);
                if (confirmAction?.type === "reject") await confirmReject(row);
                else await confirmApprove(row);
              }}
              disabled={busyId === confirmAction?.row?.RequestID}
            >
              {confirmAction?.type === "reject" ? "Reject" : "Approve"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
