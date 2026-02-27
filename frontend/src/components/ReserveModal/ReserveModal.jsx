import styles from "./ReserveModal.module.css";
import { FiX, FiMinus, FiPlus } from "react-icons/fi";
import { useEffect, useState } from "react";

export default function ReserveModal({ product, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQty(1);
    setSubmitting(false);
  }, [product]);

  if (!product) return null;

  const price = Number(product.price);
  const subtotal = qty * price;
  const handleClose = () => onClose?.();

  const handleConfirm = () => {
    if (typeof onConfirm !== "function") return;
    const max = Number(product?.available);
    const safeQty = Math.max(1, Number(qty) || 1);

    if (Number.isFinite(max) && safeQty > max) {
      alert("Not enough stock available");
      return;
    }

    setSubmitting(true);

    Promise.resolve(onConfirm(product, safeQty))
      .then(() => {
        onClose?.();
      })
      .catch((e) => {
        // onConfirm should throw normalized error from axiosClient
        alert(e?.message || "Reservation failed");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.header}>
          <h3>Reserve Part</h3>
          <button className={styles.closeBtn} onClick={handleClose}>
            <FiX />
          </button>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          <div className={styles.left}>
            <img src={product?.image || undefined} alt={product.name} />
          </div>

          <div className={styles.right}>
            <h4>{product.name}</h4>

            <div className={styles.meta}>
              <div>Part No: {product.partNo}</div>
              <div className={styles.price}>
                LKR {price.toLocaleString("en-LK")}.00
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.label}>Reserve Quantity</div>
              <div className={styles.qty}>
                <button
                  onClick={() =>
                    setQty((q) => {
                      const current = Number(q);
                      const safeCurrent = Number.isFinite(current) ? current : 1;
                      return Math.max(1, safeCurrent - 1);
                    })
                  }
                >
                  <FiMinus />
                </button>
                <span>{qty}</span>
                <button
                  onClick={() =>
                    setQty((q) => {
                      const current = Number(q);
                      const safeCurrent = Number.isFinite(current) ? current : 1;
                      const max = Number(product?.available);
                      if (!Number.isFinite(max) || max <= 0) return safeCurrent;
                      return Math.min(max, safeCurrent + 1);
                    })
                  }
                >
                  <FiPlus />
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.label}>Available Stock</div>
              <div className={styles.stock}>
                {product.available} units
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <div className={styles.totals}>
            <div>
              <span>Subtotal</span>
              <span>
                LKR {subtotal.toLocaleString("en-LK")}.00
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.cancel} onClick={handleClose}>
              Cancel
            </button>
            <button
              className={styles.confirm}
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Confirm Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
