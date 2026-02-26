import { useState } from "react";
import styles from "./ProductCard.module.css";
import Badge from "../Badge/Badge.jsx";
import { FiEye, FiShoppingCart } from "react-icons/fi";

export default function ProductCard({ product, onReserve, onViewDetails }) {
  const isLow = product.stockLabel === "Low Stock";
  const available = Number(product.available ?? 0);
  const [imageError, setImageError] = useState(false);

  const handleReserve = () => {
    console.log("[ProductCard] Reserve click", product);
    if (!onReserve) return;
    onReserve(product);
  };

  const handleViewDetails = () => {
    if (!onViewDetails) return;
    if (!product?.id) return;
    onViewDetails(product);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.card}>
      <div
        className={styles.img}
        style={{
          backgroundImage: product?.image && !imageError
            ? `url(${product.image})`
            : "none",
        }}
        onError={handleImageError}
      />

      <div className={styles.body}>
        <div className={styles.row1}>
          <div className={styles.name}>{product.name}</div>

          <div className={styles.stock}>
            {isLow ? (
              <Badge tone="danger">Low Stock</Badge>
            ) : (
              <Badge tone="success">In Stock</Badge>
            )}
          </div>
        </div>

        <div className={styles.meta}>
          Part # : {product.partNo || "N/A"}
        </div>

        <div className={styles.desc}>{product.desc}</div>

        <div className={styles.priceRow}>
          <div className={styles.price}>
            LKR {Number(product.price).toLocaleString("en-LK")}.00
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
