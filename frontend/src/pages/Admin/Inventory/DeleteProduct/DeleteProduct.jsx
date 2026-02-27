import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiTrash2 } from "react-icons/fi";
import styles from "./DeleteProduct.module.css";
import toast from "react-hot-toast";
import { inventoryAPI } from "../../../../api/inventory";


export default function DeleteProduct() {
  const isMountedRef = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    const load = async () => {
      try {
        const res = await inventoryAPI.getById(id);
        if (!isMountedRef.current) return;
        setProduct(res?.data || null);
      } catch (e) {
        console.error("getProductById failed:", e);
        toast.error(e?.message || "Product load failed");
        if (isMountedRef.current) {
          setProduct(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [id]);


  // Demo data only (replace with real data later)
  

  const goBack = () => navigate(-1);

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this product?");
    if (!ok) return;

    if (deleting) return;

    try {
      setDeleting(true);
      await inventoryAPI.remove(id);
      toast.success("Product deleted");
      navigate(`${base}/inventory`, { replace: true });
    } catch (e) {
      console.error("deleteProduct failed:", e);
      toast.error(e?.message || "Delete failed");
    } finally {
      if (isMountedRef.current) {
        setDeleting(false);
      }
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!product) return <div style={{ padding: 24 }}>Product not found</div>;


  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <button className={styles.backBtn} type="button" onClick={goBack}>
          <FiArrowLeft />
          Back
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.iconWrap}>
            <FiAlertTriangle />
          </div>
          <div>
            <div className={styles.h1}>Delete Product</div>
            <div className={styles.sub}>
              This action cannot be undone. Please confirm the product details before deleting.
            </div>
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.row}>
            <div className={styles.label}>Product ID</div>
            <div className={styles.value}>{product.ProductID}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Product Name</div>
            <div className={styles.valueStrong}>{product.Name}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Category</div>
            <div className={styles.value}>{product.CategoryName || "N/A"}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Price</div>
            <div className={styles.value}>Rs {Number(product.Price).toLocaleString()}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Stock Quantity</div>
            <div className={styles.value}>{product.Stock}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Minimum Required</div>
            <div className={styles.value}>{product.StockLimit ?? "N/A"}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>SKU</div>
            <div className={styles.value}>{product.CategoryCode || product.ProductID}</div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} type="button" onClick={goBack}>
            Cancel
          </button>
          <button
            className={styles.deleteBtn}
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={deleting ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          >
            <FiTrash2 />
            {deleting ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
