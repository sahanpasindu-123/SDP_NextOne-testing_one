import { FiSearch, FiCheck, FiX, FiClock, FiCheckCircle, FiCalendar } from "react-icons/fi";
import { useState, useEffect, useMemo, useRef } from "react";
import { employeeReservationsAPI } from "../../api/employeeReservations";
import { salesAPI } from "../../api/sales";
import StatCard from "../../components/StatCard/StatCard.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Table from "../../components/Table/Table.jsx";
import styles from "./Reservations.module.css";
import toast from "react-hot-toast";
import Modal from "../../components/Modal/Modal.jsx";
import Button from "../../components/Button/Button.jsx";

const formatReservationId = (id) => {
  const raw = String(id ?? "").trim();
  if (!raw) return "-";
  if (raw.toUpperCase().startsWith("RES-")) return raw;
  const clean = raw.replace(/^#\s*/, "");
  return `RES-${clean}`;
};

export default function Reservations() {
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL|PENDING|CONFIRMED|COMPLETED|REJECTED|CANCELLED
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'reject'|'sale', row }
  const [busyId, setBusyId] = useState(null);

  const statusFilterRef = useRef(statusFilter);
  const isMountedRef = useRef(true);
  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  // ---------
  // Helpers
  // ---------
  const normalizeStatusLabel = (rawStatus) => {
    const s = String(rawStatus || "").toUpperCase();
    if (s === "PENDING") return "Pending";
    if (s === "RESERVED") return "Reserved";
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

  // ---------
  // Load reservations (server filtered by status)
  // ---------
  const load = async () => {
    try {
      setError(null);
      setLoading(true);

      const params = {};
      const currentFilter = statusFilterRef.current;
      if (currentFilter !== "ALL") params.status = currentFilter;

      const res = await employeeReservationsAPI.list(params);
      if (res?.meta?.reason === "NO_PLACE_ASSIGNMENTS") {
        if (isMountedRef.current) {
          setRows([]);
          setError(
            res?.message ||
              "No place assignments found. Ask an admin to assign you to a place."
          );
        }
        return;
      }
      const list = Array.isArray(res?.data) ? res.data : [];

      const mapped = list.map((r) => ({
        id: r.ReservationID,
        customer: r.customer?.Name || "N/A",
        phone: r.customer?.Phone || "N/A",
        items: `${r.product?.Name || "N/A"}\nQty: ${r.Quantity}`,
        total: formatMoney(r.Total),
        expire: formatDate(r.ExpiresAt),
        status: normalizeStatusLabel(r.Status),
        raw: r,
      }));

      if (!isMountedRef.current) return;
      setRows(mapped);
    } catch (e) {
      console.error("load reservations failed:", e);
      if (isMountedRef.current) {
        setError("Failed to load reservations");
        setRows([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Always reload when filter changes
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------
  // Client-side search filter (fast)
  // ---------
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      return (
        String(r.id).toLowerCase().includes(q) ||
        String(r.customer).toLowerCase().includes(q) ||
        String(r.phone).toLowerCase().includes(q) ||
        String(r.items).toLowerCase().includes(q) ||
        String(r.status).toLowerCase().includes(q)
      );
    });
  }, [rows, searchText]);

  // ---------
  // Stats (computed)
  // ---------
  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "Pending").length;
    const approved = rows.filter((r) => r.status === "Approved").length;

    // "Today's Pickup" = reservations expiring today (simple proxy)
    const today = new Date().toISOString().slice(0, 10);
    const todaysPickup = rows.filter((r) => r.expire === today).length;

    return { pending, approved, todaysPickup };
  }, [rows]);

  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Approved" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  // ---------
  // Table columns
  // ---------
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
    { key: "items", header: "Items" },
    {
      key: "total",
      header: "Total",
      width: 120,
      render: (r) => <strong>{r.total}</strong>,
    },
    {
      key: "expire",
      header: "Expire Date",
      width: 170,
      render: (r) => <span className={styles.date}>Date: {r.expire}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      render: (r) =>
        r.status === "Pending" ? (
          <Badge tone="warn">Pending</Badge>
        ) : r.status === "Approved" ? (
          <Badge tone="info">Approved</Badge>
        ) : r.status === "Completed" ? (
          <Badge tone="success">Completed</Badge>
        ) : r.status === "Rejected" ? (
          <Badge tone="danger">Rejected</Badge>
        ) : (
          <Badge tone="muted">{r.status}</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (r) =>
        String(r.raw?.Status || "").toUpperCase() === "PENDING" ||
        String(r.raw?.Status || "").toUpperCase() === "RESERVED" ? (
          <div className={styles.actions}>
            <button
              className={`${styles.aBtn} ${styles.ok}`}
              onClick={async () => {
                try {
                  setBusyId(r.id);
                  await employeeReservationsAPI.approve(r.id);
                  await load();
                  toast.success("Reservation approved");
                } catch (e) {
                  console.error("approve failed:", e);
                  toast.error(e?.message || "Approve failed");
                } finally {
                  setBusyId(null);
                }
              }}
              title="Approve"
              disabled={busyId === r.id}
            >
              <FiCheck />
            </button>

            <button
              className={`${styles.aBtn} ${styles.no}`}
              onClick={async () => {
                setConfirmAction({ type: "reject", row: r });
              }}
              title="Reject"
              disabled={busyId === r.id}
            >
              <FiX />
            </button>
          </div>
        ) : r.status === "Approved" ? (
          <button
            className={styles.saleBtn}
            onClick={async () => {
              setConfirmAction({ type: "sale", row: r });
            }}
            disabled={busyId === r.id}
          >
            Sale
          </button>
        ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <div className="pageTitle">Reservations</div>

      <div className={styles.blockTitle}>
        <div className={styles.sub}>Manage customer reservations for spare parts.</div>
      </div>

      <div className={`card ${styles.searchBar}`}>
        <div className={styles.search}>
          <FiSearch className={styles.sIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter reservations by status"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="Pending Reservations"
          value={String(stats.pending)}
          icon={<FiClock />}
          iconTone="accent"
        />
        <StatCard
          label="Confirmed Reservations"
          value={String(stats.approved)}
          icon={<FiCheckCircle />}
          iconTone="blue"
        />
        <StatCard
          label="Today's Pickup"
          value={String(stats.todaysPickup)}
          icon={<FiCalendar />}
          iconTone="purple"
        />
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>All Reservations</div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <button className={styles.saleBtn} onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <Table
            columns={cols}
            rows={filteredRows.map((r) => ({
              ...r,
              items: String(r.items)
                .split("\n")
                .map((x, i) => (
                  <div key={i} className={x.startsWith("Note:") ? styles.note : ""}>
                    {x}
                  </div>
                )),
            }))}
          />
        )}
      </div>

      <Modal
        open={!!confirmAction}
        title={confirmAction?.type === "sale" ? "Create Sale" : "Reject Reservation"}
        onClose={() => setConfirmAction(null)}
        width={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            {confirmAction?.type === "sale" ? "Create a sale from" : "Reject"} reservation{" "}
            <span style={{ fontWeight: 900 }}>{formatReservationId(confirmAction?.row?.id)}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {confirmAction?.type === "sale"
              ? "This will complete the reservation and create a sale."
              : "This will mark the reservation as rejected."}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button
              variant="secondary"
              onClick={() => setConfirmAction(null)}
              disabled={busyId === confirmAction?.row?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const action = confirmAction;
                const id = action?.row?.id;
                if (!id) return;
                setConfirmAction(null);
                setBusyId(id);
                try {
                  if (action.type === "sale") {
                    await salesAPI.createFromReservation(id, "CASH");
                    toast.success("Sale created (reservation completed)");
                  } else {
                    await employeeReservationsAPI.reject(id);
                    toast.success("Reservation rejected");
                  }
                  await load();
                } catch (e) {
                  console.error("action failed:", e);
                  toast.error(e?.message || (action?.type === "sale" ? "Sale failed" : "Reject failed"));
                } finally {
                  setBusyId(null);
                }
              }}
              disabled={busyId === confirmAction?.row?.id}
            >
              {confirmAction?.type === "sale" ? "Create Sale" : "Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
