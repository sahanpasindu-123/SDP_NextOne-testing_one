import React from "react";
import "./ProductDetailModal.css";
import fallbackImg from "../../assets/JCB_IMG/img1.jpg";

const ProductModal = ({ isOpen, onClose, product, onReserve }) => {
  if (!isOpen || !product) return null;

  const safeName = String(product?.name || "Product");
  const rawPrice = Number(product?.price);
  const price = Number.isFinite(rawPrice) ? rawPrice : 0;
  const rawAvail = Number(product?.available);
  const available = Number.isFinite(rawAvail) ? rawAvail : 0;
  const stockLabel =
    product.stockLabel || (available === 0 ? "Out of Stock" : available <= 5 ? "Low Stock" : "In Stock");

  const handleReserve = () => {
    if (onClose) onClose();
    if (!onReserve) return;
    onReserve(product);
  };

  return (
    <div className="modal-overlay" onClick={() => onClose?.()}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Product Details</h2>
          <button className="close-btn" onClick={() => onClose?.()}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="image-section">
            <img
              src={typeof product?.image === "string" && product.image ? product.image : fallbackImg}
              alt={safeName}
              onError={(e) => {
                if (e.currentTarget.src !== fallbackImg) {
                  e.currentTarget.src = fallbackImg;
                } else {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "";
                }
              }}
            />
          </div>

          <div className="details-section">
            <span className="stock-badge">{stockLabel}</span>
            <h3>{safeName}</h3>

            <div className="info-row">
              <span>Price:</span>
              <span className="price">
                LKR {price.toLocaleString("en-LK")}.00
              </span>
            </div>

            <div className="info-row">
              <span>Stock Quantity:</span>
              <span>{available} units</span>
            </div>

            <div className="description">
              <h4>Description</h4>
              <p>{product?.desc || "N/A"}</p>
            </div>

            <button className="reserve-btn" onClick={handleReserve}>
              Reserve This Part
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
