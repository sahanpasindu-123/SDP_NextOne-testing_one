import { useEffect, useState } from "react";
import styles from "./ProductCard.module.css";
import Badge from "../Badge/Badge.jsx";
import { FiEye, FiShoppingCart } from "react-icons/fi";

function isMeaningfulValue(value) {
  if (value == null) return false;

  const text = String(value).trim();
  if (!text) return false;

  const normalized = text.toLowerCase();
  if (normalized === "n/a") return false;
  if (normalized === "na") return false;
  if (normalized === "null") return false;
  if (normalized === "undefined") return false;
  if (normalized === "-") return false;

  return true;
}

function firstMeaningful(...candidates) {
  for (const candidate of candidates) {
    if (isMeaningfulValue(candidate)) return String(candidate).trim();
  }
  return "";
}

export default function ProductCard({ product, onReserve, onViewDetails }) {
  const safeProduct = product || {};
  const available = Number(safeProduct.available ?? 0);
  const canReserve = !Number.isFinite(available) ? true : available > 0;
  const lowThreshold = Number(safeProduct.lowStockThreshold ?? safeProduct.stockLimit ?? 0) || 5;
  const stockLabel =
    safeProduct.stockLabel ||
    (available <= 0 ? "Out of Stock" : available <= lowThreshold ? "Low Stock" : "In Stock");
  const [imageError, setImageError] = useState(false);
  const displayName = firstMeaningful(safeProduct.productName, safeProduct.name) || "Unnamed Product";
  const effectiveId = firstMeaningful(
    safeProduct.productId,
    safeProduct.id,
    safeProduct.partId,
    safeProduct.partNo,
    safeProduct.ProductID,
    safeProduct.PartID
  );
  const stockText = `${stockLabel}${Number.isFinite(available) ? ` (${available} available)` : ""}`;

  const handleReserve = () => {
    console.log("[ProductCard] Reserve click", safeProduct);
    if (!canReserve) return;
    if (!onReserve) return;
    onReserve(
      effectiveId
        ? { ...safeProduct, productId: effectiveId, id: effectiveId }
        : safeProduct
    );
  };

  const handleViewDetails = () => {
    if (!onViewDetails) return;
    if (!effectiveId) return;
    onViewDetails({ ...safeProduct, productId: effectiveId, id: effectiveId });
  };

  const handleImageError = () => {
    setImageError(true);
  };

  useEffect(() => {
    const src = safeProduct?.image;
    if (!src) {
      setImageError(true);
      return;
    }

    setImageError(false);
    const img = new Image();
    img.onload = () => setImageError(false);
    img.onerror = () => setImageError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [safeProduct?.image]);

  return (
    <div className={styles.card}>
      <div
        className={styles.img}
        style={{
          backgroundImage:
            safeProduct?.image && !imageError
              ? `url(${safeProduct.image})`
              : "none",
        }}
        onError={handleImageError}
      />

      <div className={styles.body}>
        <div className={styles.row1}>
          <div className={styles.name}>{displayName}</div>

          <div className={styles.stock}>
            {stockLabel === "Out of Stock" ? (
              <Badge tone="danger">Out of Stock</Badge>
            ) : stockLabel === "Low Stock" ? (
              <Badge tone="danger">Low Stock</Badge>
            ) : (
              <Badge tone="success">In Stock</Badge>
            )}
          </div>
        </div>

        <div className={styles.desc}>{safeProduct.desc || "No description available."}</div>

        <div className={styles.priceRow}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Price:</span>
            <span className={styles.price}>
              LKR {Number(safeProduct.price || 0).toLocaleString("en-LK")}.00
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Stock:</span>
            <span className={styles.avail}>{stockText}</span>
          </div>
        </div>

        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.viewBtn}
            onClick={handleViewDetails}
          >
            <FiEye /> <span>View Details</span>
          </button>

          <button
            type="button"
            className={styles.reserveBtn}
            onClick={handleReserve}
            disabled={!canReserve}
            title={!canReserve ? "Out of stock" : "Reserve"}
          >
            <FiShoppingCart /> <span>Reserve</span>
          </button>
        </div>
      </div>
    </div>
  );
}
