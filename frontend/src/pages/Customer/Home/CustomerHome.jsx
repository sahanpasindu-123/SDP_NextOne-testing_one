import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./CustomerHome.module.css";
import ProductCard from "../../../components/ProductCard/ProductCard.jsx";
import ReserveModal from "../../../components/ReserveModal/ReserveModal";
import axiosClient from "../../../api/axiosClient"; // ✅ make sure this path is correct

import heroBg from "../../../assets/JCB_IMG/img5.jpg";
import prodImg1 from "../../../assets/JCB_IMG/img1.jpg";
import prodImg2 from "../../../assets/JCB_IMG/img2.jpg";
import prodImg3 from "../../../assets/JCB_IMG/img3.jpg";
import prodImg4 from "../../../assets/JCB_IMG/img4.jpg";
import prodImg5 from "../../../assets/JCB_IMG/img5.jpg";
import prodImg6 from "../../../assets/JCB_IMG/img6.jpg";

const productImages = [prodImg1, prodImg2, prodImg3, prodImg4, prodImg5, prodImg6];

/**
 * ✅ Backend unchanged strategy:
 * - Fetch products from existing endpoint
 * - No dummy fallback
 * - Add loading/error/empty states
 * - Derive "New Arrivals" on the frontend
 * - Keep Reserve flow optimistic (UI-only) because backend isn't updated
 */

// 🔧 CHANGE ONLY THIS if needed:
const PRODUCTS_ENDPOINT = "/products"; // or "/products/public"

function formatLKR(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return "LKR 0.00";
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeProduct(raw, idx = 0) {
  // Handle multiple possible backend field names without changing backend
  const id = raw.id ?? raw.ProductID ?? raw.productId ?? raw.ProductId ?? idx + 1;

  const name =
    raw.name ?? raw.ProductName ?? raw.productName ?? raw.title ?? "Unnamed Product";

  const partNo = raw.partNo ?? raw.PartNo ?? raw.part_number ?? raw.partNumber ?? raw.sku ?? "";

  const desc = raw.desc ?? raw.description ?? raw.ProductDescription ?? "";

  const price = raw.price ?? raw.Price ?? raw.unitPrice ?? 0;

  const available =
    raw.available ??
    raw.stock ??
    raw.quantity ??
    raw.AvailableQty ??
    raw.qty ??
    0;

  const image =
    raw.imageUrl ??
    raw.image ??
    raw.thumbnail ??
    raw.ProductImage ??
    productImages[idx % productImages.length];

  // createdAt is optional; if missing, we'll fall back to id for "new arrivals"
  const createdAt = raw.createdAt ?? raw.CreatedAt ?? raw.created_at ?? null;

  // stock label for UI
  const safeAvailable = Math.max(0, Number(available) || 0);
  const stockLabel = safeAvailable === 0 ? "Out of Stock" : safeAvailable <= 5 ? "Low Stock" : "In Stock";

  return {
    id,
    name,
    partNo,
    desc,
    price: Number(price) || 0,
    available: safeAvailable,
    stockLabel,
    image,
    createdAt,
  };
}

export default function CustomerHome() {
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Simple client-side pagination (backend unchanged)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Optional: simple search (frontend only)
  const [q, setQ] = useState("");

  const products = useMemo(() => {
    return rawProducts.map((p, idx) => normalizeProduct(p, idx));
  }, [rawProducts]);

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;

    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(query) ||
        (p.partNo || "").toLowerCase().includes(query)
      );
    });
  }, [products, q]);

  const newArrivals = useMemo(() => {
    // Prefer createdAt, else fallback to numeric id
    const withCreated = filteredProducts.filter((p) => p.createdAt);
    const base = withCreated.length > 0 ? withCreated : filteredProducts;

    return [...base]
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        // fallback: larger id = newer (approx)
        const ai = Number(a.id) || 0;
        const bi = Number(b.id) || 0;
        return bi - ai;
      })
      .slice(0, 6);
  }, [filteredProducts]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  }, [filteredProducts.length]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axiosClient.get(PRODUCTS_ENDPOINT);

      // Support possible response shapes:
      // 1) { data: [...] }
      // 2) { data: { data: [...] } }
      // 3) [...]
      const list = res?.data?.data ?? res?.data ?? [];
      setRawProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      // axiosClient normalized errors => err.message + err.status
      const status = err?.status;
      if (status === 401 || status === 403) {
        setError("Please log in to view products.");
      } else {
        setError(err?.message || "Failed to load products.");
      }
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reserve confirm = UI-only optimistic update (backend unchanged)
  const handleReserveConfirm = (product, qty) => {
    const qNum = Math.max(1, Number(qty) || 1);

    setRawProducts((prev) => {
      const normalizedPrev = prev.map((p, idx) => normalizeProduct(p, idx));
      const updated = normalizedPrev.map((p) => {
        if (p.id !== product.id) return p;

        const nextAvail = Math.max(0, p.available - qNum);
        const stockLabel = nextAvail === 0 ? "Out of Stock" : nextAvail <= 5 ? "Low Stock" : "In Stock";
        return { ...p, available: nextAvail, stockLabel };
      });

      // Convert back to raw-ish objects so we keep structure consistent
      // Here we just store normalized objects; that's fine for UI.
      return updated;
    });

    setSelectedProduct(null);
  };

  return (
    <>
      <div className={styles.page}>
        {/* HERO */}
        <section
          className={styles.hero}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.45)), url(${heroBg})`,
          }}
        >
          <div className={styles.heroInner}>
            <h1>Genuine JCB Spare Parts</h1>
            <p>Find the right parts for your JCB machinery</p>
          </div>
        </section>

        {/* SEARCH */}
        <section className={styles.section}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Browse and reserve genuine JCB parts</h2>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by part no or name..."
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(0,0,0,.2)",
                  color: "inherit",
                  minWidth: 240,
                }}
              />
              <button
                onClick={fetchProducts}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.15)",
                  background: "rgba(0,0,0,.25)",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* STATES */}
          {loading && <p style={{ marginTop: 12 }}>Loading products...</p>}

          {!loading && error && (
            <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <p style={{ marginTop: 12 }}>No products available.</p>
          )}

          {/* NEW ARRIVALS */}
          {!loading && !error && newArrivals.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>New Arrivals</h3>
              <div className={styles.grid}>
                {newArrivals.map((p) => (
                  <ProductCard key={`new-${p.id}`} product={{ ...p, priceLabel: formatLKR(p.price) }} onReserve={setSelectedProduct} />
                ))}
              </div>
            </>
          )}

          {/* ALL PRODUCTS */}
          {!loading && !error && pagedProducts.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>All Products</h3>
              <div className={styles.grid}>
                {pagedProducts.map((p) => (
                  <ProductCard key={p.id} product={{ ...p, priceLabel: formatLKR(p.price) }} onReserve={setSelectedProduct} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((v) => Math.max(1, v - 1))}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.15)",
                      background: "rgba(0,0,0,.25)",
                      color: "inherit",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      opacity: page <= 1 ? 0.6 : 1,
                    }}
                  >
                    Prev
                  </button>

                  <span>
                    Page {page} / {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.15)",
                      background: "rgba(0,0,0,.25)",
                      color: "inherit",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      opacity: page >= totalPages ? 0.6 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selectedProduct && (
        <ReserveModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={handleReserveConfirm}
        />
      )}
    </>
  );
}
