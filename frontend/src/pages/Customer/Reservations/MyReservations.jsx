import { useEffect, useMemo, useState, useRef } from "react";
import styles from "./MyReservations.module.css";
import Badge from "../../../components/Badge/Badge.jsx";
import { reservationsAPI } from "../../../api/reservations";
import Modal from "../../../components/Modal/Modal.jsx";
import Button from "../../../components/Button/Button.jsx";

const formatReservationId = (id) => {
  const raw = String(id ?? "").trim();
  if (!raw) return "—";
  if (raw.toUpperCase().startsWith("RES-")) return raw;
  const clean = raw.replace(/^#\s*/, "");
  return `RES-${clean}`;
};

const normalizeStatusLabel = (rawStatus) => {
  const s = String(rawStatus || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "RESERVED") return "Reserved";
  if (s === "CONFIRMED") return "Reserved";
  if (s === "COMPLETED") return "Completed";
  if (s === "REJECTED") return "Rejected";
  if (s === "CANCELLED") return "Cancelled";
  return rawStatus || "Pending";
};

const formatMoney = (val) => {
  const n = Number(val || 0);
  return `LKR ${n.toLocaleString("en-LK")}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
};

export default function MyReservations() {
  const isMountedRef = useRef(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await reservationsAPI.getMyReservations();
      const list = Array.isArray(res?.data) ? res.data : [];

      if (!isMountedRef.current) return;
      setRows(
        list.map((r) => ({
          id: r.ReservationID,
          productId: r.product?.ProductID ?? r.ProductID ?? r.productId ?? r.product?.productId ?? "-",
          categoryCode:
            r.product?.CategoryCode ??
            r.product?.categoryCode ??
            r.product?.category?.CategoryCode ??
            r.product?.category?.categoryCode ??
            "-",
          part: r.product?.Name ?? "—",
          qty: r.Quantity,
          date: formatDate(r.ReservedAt),
          status: normalizeStatusLabel(r.Status),
          rawStatus: String(r.Status || "").toUpperCase(),
          amount: formatMoney(r.Total),
        }))
      );
    } catch (e) {
      console.error("load my reservations failed:", e);
      if (isMountedRef.current) {
        setMessage({ type: "error", text: e?.message || "Failed to load reservations" });
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
    load();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  const handleCancelReservation = async (reservationId) => {
    setCancelTarget(reservationId);
  };

  const confirmCancelReservation = async () => {
    const reservationId = cancelTarget;
    if (!reservationId) return;
    try {
      if (isMountedRef.current) {
        setMessage(null);
        setCancellingId(reservationId);
      }

      await reservationsAPI.cancelReservation(reservationId);

      if (!isMountedRef.current) return;
      setMessage({ type: "success", text: `Reservation ${formatReservationId(reservationId)} cancelled` });
      setCancelTarget(null);
      await load(); // re-fetch
    } catch (e) {
      console.error("cancel failed:", e);
      if (isMountedRef.current) {
        setMessage({ type: "error", text: e?.message || "Cancel failed" });
      }
    } finally {
      if (isMountedRef.current) {
        setCancellingId(null);
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>My Reservations</h1>
        <p>Track your reserved parts and reservation updates.</p>
      </div>

      {message ? (
        <div className={`${styles.message} ${message.type === "success" ? styles.success : styles.error}`}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.card}>
        <div className={styles.tHead}>
          <div>Reservation</div>
          <div>Product</div>
          <div>Qty</div>
          <div>Date</div>
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Amount</div>
          <div style={{ textAlign: "right" }}>Action</div>
        </div>

        {loading ? (
          <div className={styles.tRow}>
            <div>Loading…</div>
          </div>
        ) : !hasRows ? (
          <div className={styles.tRow}>
            <div>No reservations yet.</div>
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className={styles.tRow}>
              <div className={styles.id}>{formatReservationId(r.id)}</div>
              <div className={styles.part}>
                <div className={styles.pName}>{r.part}</div>
                <div className={styles.pMeta}>
                  <span>Product ID: {r.productId}</span>
                  <span className={styles.dot}>•</span>
                  <span>Category: {r.categoryCode}</span>
                </div>
              </div>
              <div>{r.qty}</div>
              <div>{r.date}</div>
              <div>
                {r.status === "Pending" ? (
                  <Badge tone="warn">Pending</Badge>
                ) : r.status === "Reserved" ? (
                  <Badge tone="info">Reserved</Badge>
                ) : r.status === "Completed" ? (
                  <Badge tone="success">Completed</Badge>
                ) : r.status === "Rejected" ? (
                  <Badge tone="danger">Rejected</Badge>
                ) : (
                  <Badge tone="muted">{r.status}</Badge>
                )}
              </div>
              <div className={styles.amount}>{r.amount}</div>

              <div className={styles.actions}>
                {r.rawStatus === "PENDING" || r.rawStatus === "RESERVED" || r.rawStatus === "CONFIRMED" ? (
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      disabled={cancellingId === r.id}
                      onClick={() => handleCancelReservation(r.id)}
                    >
                      {cancellingId === r.id ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                ) : (
                  <span style={{ opacity: 0.7 }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={!!cancelTarget}
        title="Cancel Reservation"
        onClose={() => setCancelTarget(null)}
        width={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            Cancel reservation <span style={{ fontWeight: 900 }}>{formatReservationId(cancelTarget)}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            You can’t undo this action.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={!!cancellingId}>
              Keep
            </Button>
            <Button onClick={confirmCancelReservation} disabled={!!cancellingId}>
              {cancellingId ? "Cancelling..." : "Cancel Reservation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
