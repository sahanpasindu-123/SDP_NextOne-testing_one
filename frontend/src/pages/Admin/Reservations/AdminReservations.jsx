import { useEffect, useMemo, useRef, useState } from "react";
import Table from "../../../components/Table/Table.jsx";
import Badge from "../../../components/Badge/Badge.jsx";
import styles from "./AdminReservations.module.css";
import { reservationsAPI } from "../../../api/reservations";

const formatReservationId = (id) => {
  const raw = String(id ?? "").trim();
  if (!raw) return "-";
  if (raw.toUpperCase().startsWith("RES-")) return raw;
  const clean = raw.replace(/^#\s*/, "");
  return `RES-${clean}`;
};

const normalizeStatusLabel = (rawStatus) => {
  const s = String(rawStatus || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "CONFIRMED") return "Approved";
  if (s === "COMPLETED") return "Completed";
  if (s === "REJECTED") return "Rejected";
  if (s === "CANCELLED") return "Cancelled";
  return rawStatus || "Pending";
};

const formatMoney = (val) => {
  const n = Number(val || 0);
  return `Rs ${n.toLocaleString("en-LK")}`;
};

const formatDate = (val) => {
  if (!val) return "N/A";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
};

export default function AdminReservations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const isMountedRef = useRef(true);
  const pollRef = useRef(null);

  const load = async ({ silent = false } = {}) => {
    try {
      setError(null);
      if (!silent) setLoading(true);
      const res = await reservationsAPI.getAdminReservations();
      const list = Array.isArray(res?.data) ? res.data : [];
      if (!isMountedRef.current) return;
      setRows(
        list.map((r) => ({
          id: r.ReservationID,
          customer: r.customer?.Name || "N/A",
          phone: r.customer?.Phone || "N/A",
          item: `${r.product?.Name || "N/A"}`,
          qty: r.Quantity,
          total: formatMoney(r.Total),
          reserved: formatDate(r.ReservedAt),
          status: normalizeStatusLabel(r.Status),
          rawStatus: String(r.Status || "").toUpperCase(),
        }))
      );
    } catch (e) {
      console.error("admin reservations load failed:", e);
      if (isMountedRef.current) {
        setError(e?.message || "Failed to load reservations");
        setRows([]);
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
        load({ silent: true });
      }, 8000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);

  const toneForStatus = (status) => {
    if (status === "Approved") return "info";
    if (status === "Rejected") return "danger";
    if (status === "Cancelled") return "muted";
    return "warn";
  };

  const cols = [
    {
      key: "id",
      header: "ID",
      width: 110,
      render: (r) => <span className={styles.id}>{formatReservationId(r.id)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div>
          <div className={styles.cName}>{r.customer}</div>
          <div className={styles.cPhone}>{r.phone}</div>
        </div>
      ),
    },
    { key: "item", header: "Item" },
    { key: "qty", header: "Qty", width: 80 },
    { key: "reserved", header: "Reserved", width: 140 },
    { key: "total", header: "Total", width: 140 },
    {
      key: "status",
      header: "Status",
      width: 130,
      render: (r) => <Badge tone={toneForStatus(r.status)}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (r) =>
        r.rawStatus === "PENDING" ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ok}
              disabled={busyId === r.id}
              onClick={async () => {
                try {
                  if (isMountedRef.current) {
                    setBusyId(r.id);
                  }
                  await reservationsAPI.adminApprove(r.id);
                  await load();
                } catch (e) {
                  alert(e?.message || "Approve failed");
                } finally {
                  if (isMountedRef.current) {
                    setBusyId(null);
                  }
                }
              }}
            >
              Approve
            </button>

            <button
              type="button"
              className={styles.no}
              disabled={busyId === r.id}
              onClick={async () => {
                const ok = window.confirm("Reject this reservation?");
                if (!ok) return;
                try {
                  if (isMountedRef.current) {
                    setBusyId(r.id);
                  }
                  await reservationsAPI.adminReject(r.id);
                  await load();
                } catch (e) {
                  alert(e?.message || "Reject failed");
                } finally {
                  if (isMountedRef.current) {
                    setBusyId(null);
                  }
                }
              }}
            >
              Reject
            </button>
          </div>
        ) : (
          <span style={{ opacity: 0.7 }}>N/A</span>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className="pageTitle">Reservations</div>
      <div className="pageSub">All customer reservations (admin).</div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>All Reservations</div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <Table columns={cols} rows={filteredRows} />
        )}
      </div>
    </div>
  );
}
