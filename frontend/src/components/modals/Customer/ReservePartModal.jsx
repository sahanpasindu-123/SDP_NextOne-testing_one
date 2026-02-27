import { useMemo, useState, useEffect } from "react";
import Modal from "../../Modal/Modal";
import { reservationsAPI } from "../../../api/reservations";

// If you already have reservations API wrapper, use that.
// Otherwise use fetch directly.
export default function ReservePartModal({ open, onClose, product, onSuccess }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // reset when open changes
  useEffect(() => {
    if (open) {
      setQty(1);
      setNotes("");
    }
  }, [open]);

  const available = product?.Stock ?? product?.available ?? 0;
  const unitPrice = product?.Price ?? product?.price ?? 0;

  const total = useMemo(() => unitPrice * qty, [unitPrice, qty]);

  const handleCancel = () => {
    onClose?.();
  };

  const handleConfirm = async () => {
    if (!product) return;

    const max = Number(available);
    const safeQty = Math.max(1, Number(qty) || 1);

    if (safeQty < 1) return;
    if (Number.isFinite(max) && safeQty > max) return;

    try {
      setLoading(true);

      const data = await reservationsAPI.createReservation(
        product.ProductID ?? product.id,
        safeQty,
        null,
        notes
      );

      if (!data?.success) {
        alert(data?.message || "Reservation failed");
        return;
      }

      alert("Reservation confirmed ✅");

      onClose?.();
      onSuccess?.();
    } catch (e) {
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Reserve Part" onClose={handleCancel} width={760}>
      {!product ? (
        <div>No product selected</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {product.Name ?? product.name}
            </div>
            <div>Available: {available}</div>
            <div>Unit Price: LKR {Number(unitPrice).toLocaleString("en-LK")}.00</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() =>
                setQty((q) => {
                  const current = Number(q);
                  const safeCurrent = Number.isFinite(current) ? current : 1;
                  return Math.max(1, safeCurrent - 1);
                })
              }
              disabled={loading}
            >
              -
            </button>

            <div style={{ minWidth: 30, textAlign: "center" }}>{qty}</div>

            <button
              type="button"
              onClick={() =>
                setQty((q) => {
                  const current = Number(q);
                  const safeCurrent = Number.isFinite(current) ? current : 1;
                  const max = Number(available);
                  if (!Number.isFinite(max) || max <= 0) return safeCurrent;
                  return Math.min(max, safeCurrent + 1);
                })
              }
              disabled={loading || available <= 0}
            >
              +
            </button>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={loading}
          />

          <div style={{ fontWeight: 700 }}>
            Total: LKR {Number(total).toLocaleString("en-LK")}.00
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || available <= 0}
            >
              {loading ? "Confirming..." : "Confirm Reservation"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
