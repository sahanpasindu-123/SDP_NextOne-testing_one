import { useEffect, useState } from "react";
import styles from "./ProductCard.module.css";
import Badge from "../Badge/Badge.jsx";
import { FiEye, FiShoppingCart } from "react-icons/fi";

export default function ProductCard({ product, onReserve, onViewDetails }) {
  const safeProduct = product || {};
  const isLow = safeProduct.stockLabel === "Low Stock";
  const available = Number(safeProduct.available ?? 0);
  const [imageError, setImageError] = useState(false);

  const handleReserve = () => {
    console.log("[ProductCard] Reserve click", safeProduct);
    if (!onReserve) return;
    onReserve(safeProduct);
  };

  const handleViewDetails = () => {
    if (!onViewDetails) return;
    if (!safeProduct?.id) return;
    onViewDetails(safeProduct);
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
          backgroundImage: safeProduct?.image && !imageError
            ? `url(${safeProduct.image})`
            : "none",
        }}
        onError={handleImageError}
      />

      <div className={styles.body}>
        <div className={styles.row1}>
          <div className={styles.name}>{safeProduct.name}</div>

          <div className={styles.stock}>
            {isLow ? (
              <Badge tone="danger">Low Stock</Badge>
            ) : (
              <Badge tone="success">In Stock</Badge>
            )}
          </div>
        </div>

        <div className={styles.meta}>
          Part # : {safeProduct.partNo || "N/A"}
        </div>

        <div className={styles.desc}>{safeProduct.desc}</div>

        <div className={styles.priceRow}>
          <div className={styles.price}>
            LKR {Number(safeProduct.price).toLocaleString("en-LK")}.00
          </div>
          <div className={styles.avail}>{available} available</div>
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
          >
            <FiShoppingCart /> <span>Reserve</span>
          </button>
        </div>
      </div>
    </div>
  );
}
