import { FiSearch, FiCheck, FiX, FiClock, FiCheckCircle, FiCalendar } from "react-icons/fi";
import { useState, useEffect, useMemo, useRef } from "react";
import { employeeReservationsAPI } from "../../api/employeeReservations";
import { salesAPI } from "../../api/sales";
import StatCard from "../../components/StatCard/StatCard.jsx";
import Badge from "../../components/Badge/Badge.jsx";
import Table from "../../components/Table/Table.jsx";
import styles from "./Reservations.module.css";

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

  // ---------
  // Status dropdown button (cycle)
  // ---------
  const cycleStatus = () => {
    const order = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED"];
    const idx = order.indexOf(statusFilter);
    setStatusFilter(order[(idx + 1) % order.length]);
  };

  const statusLabel = statusFilter === "ALL" ? "All Statuses" : statusFilter;

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
        r.status === "Pending" ? (
          <div className={styles.actions}>
            <button
              className={`${styles.aBtn} ${styles.ok}`}
              onClick={async () => {
                try {
                  await employeeReservationsAPI.approve(r.id);
                  await load();
                } catch (e) {
                  console.error("approve failed:", e);
                  alert("Approve failed");
                }
              }}
              title="Approve"
            >
              <FiCheck />
            </button>

            <button
              className={`${styles.aBtn} ${styles.no}`}
              onClick={async () => {
                const ok = window.confirm("Reject this reservation?");
                if (!ok) return;
                try {
                  await employeeReservationsAPI.reject(r.id);
                  await load();
                } catch (e) {
                  console.error("reject failed:", e);
                  alert("Reject failed");
                }
              }}
              title="Reject"
            >
              <FiX />
            </button>
          </div>
        ) : r.status === "Approved" ? (
          <button
            className={styles.saleBtn}
            onClick={async () => {
              const ok = window.confirm("Create Sale from this reservation?");
              if (!ok) return;
              try {
                await salesAPI.createFromReservation(r.id, "CASH");
                await load();
                alert("Sale created (Reservation completed)");
              } catch (e) {
                console.error("sale failed:", e);
                alert("Sale failed");
              }
            }}
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
        <div className={styles.h1}>Reservations</div>
        <div className={styles.sub}>Manage customer reservations for spare parts.</div>
      </div>

      <div className={`card ${styles.searchBar}`}>
        <div className={styles.search}>
          <FiSearch className={styles.sIcon} />
          <input
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <button className={styles.dd} onClick={cycleStatus}>
          {statusLabel} v
        </button>
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
    </div>
  );
}
