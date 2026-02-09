import { useEffect, useMemo, useState } from "react";
import styles from "./MyReservations.module.css";
import Badge from "../../../components/Badge/Badge.jsx";
import { reservationsAPI } from "../../../api/reservations";

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
  return `LKR ${n.toLocaleString("en-LK")}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
};

export default function MyReservations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }

  const load = async () => {
    try {
      setLoading(true);
      const res = await reservationsAPI.getMyReservations();
      const list = res?.data || [];

      setRows(
        list.map((r) => ({
          id: r.ReservationID,
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
      setMessage({ type: "error", text: e?.message || "Failed to load reservations" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  const handleCancelReservation = async (reservationId) => {
    const ok = window.confirm("Cancel this reservation?");
    if (!ok) return;

    try {
      setMessage(null);
      setCancellingId(reservationId);

      await reservationsAPI.cancelReservation(reservationId);

      setMessage({ type: "success", text: "Reservation cancelled" });
      await load(); // re-fetch
    } catch (e) {
      console.error("cancel failed:", e);
      setMessage({ type: "error", text: e?.message || "Cancel failed" });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>My Reservations</h1>
        <p>Track your reserved parts and status updates.</p>
      </div>

      {message ? (
        <div className={`${styles.message} ${message.type === "success" ? styles.success : styles.error}`}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.card}>
        <div className={styles.tHead}>
          <div>Reservation</div>
          <div>Part</div>
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
              <div className={styles.id}>#{r.id}</div>
              <div className={styles.part}>{r.part}</div>
              <div>{r.qty}</div>
              <div>{r.date}</div>
              <div>
                {r.status === "Pending" ? (
                  <Badge tone="warn">Pending</Badge>
                ) : r.status === "Approved" ? (
                  <Badge tone="info">Approved</Badge>
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
                {r.rawStatus === "PENDING" ? (
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
    </div>
  );
}
