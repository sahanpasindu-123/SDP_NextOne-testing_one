import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./CustomerHome.module.css";
import ProductCard from "../../../components/ProductCard/ProductCard.jsx";
import ReserveModal from "../../../components/ReserveModal/ReserveModal";
import productsAPI from "../../../api/products";
import { mapApiProductToCard } from "../Catalog/PartsCatalog.jsx";

import heroBg from "../../../assets/JCB_IMG/img5.jpg";

export default function CustomerHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);

  // Simple client-side pagination (backend unchanged)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Optional: simple search (frontend only)
  const [q, setQ] = useState("");

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

      const res = await productsAPI.getProducts();
      const list = res?.data || [];
      const mapped = Array.isArray(list) ? list.map(mapApiProductToCard) : [];
      setProducts(mapped);
    } catch (err) {
      // Normalize errors when possible (status/message)
      const status = err?.status;
      if (status === 401 || status === 403) {
        setError("Please log in to view products.");
      } else {
        setError(err?.message || "Failed to load products.");
      }
      setProducts([]);
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

    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== product.id) return p;

        const nextAvail = Math.max(0, p.available - qNum);
        const stockLabel = nextAvail === 0 ? "Out of Stock" : nextAvail <= 5 ? "Low Stock" : "In Stock";
        return { ...p, available: nextAvail, stockLabel };
      });

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
                  <ProductCard key={`new-${p.id}`} product={p} onReserve={setSelectedProduct} />
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
                  <ProductCard key={p.id} product={p} onReserve={setSelectedProduct} />
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











