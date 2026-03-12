import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import styles from "./CustomerHome.module.css";
import ProductCard from "../../../components/ProductCard/ProductCard.jsx";
import ProductDetailModal from "../../../components/ProductDetailModal/ProductDetailModal.jsx";
import ReserveModal from "../../../components/ReserveModal/ReserveModal";
import productsAPI from "../../../api/products";
import { reservationsAPI } from "../../../api/reservations";
import { mapApiProductToCard } from "../Catalog/PartsCatalog.jsx";

import heroBg from "../../../assets/JCB_IMG/img5.jpg";

export default function CustomerHome() {
  const isMountedRef = useRef(true);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [q, setQ] = useState("");

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;

    return products.filter((p) => {
      return (
        String(p?.name || "").toLowerCase().includes(query) ||
        String(p?.productCode || "").toLowerCase().includes(query) ||
        String(p?.category || "").toLowerCase().includes(query)
      );
    });
  }, [products, q]);

  const newArrivals = useMemo(() => {
    const withCreated = filteredProducts.filter((p) => p.createdAt);
    const base = withCreated.length > 0 ? withCreated : filteredProducts;

    return [...base]
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }

        const ai = Number(a.id) || 0;
        const bi = Number(b.id) || 0;
        return bi - ai;
      })
      .slice(0, 6);
  }, [filteredProducts]);

  const allProductsOnly = useMemo(() => {
    const arrivalIds = new Set(newArrivals.map((p) => String(p.id)));
    return filteredProducts.filter((p) => !arrivalIds.has(String(p.id)));
  }, [filteredProducts, newArrivals]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(allProductsOnly.length / PAGE_SIZE));
  }, [allProductsOnly.length]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allProductsOnly.slice(start, start + PAGE_SIZE);
  }, [allProductsOnly, page]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await productsAPI.getProducts();
      const list = res?.data || [];
      const mapped = Array.isArray(list) ? list.map(mapApiProductToCard) : [];

      if (!isMountedRef.current) return;
      setProducts(mapped);
    } catch (err) {
      const status = err?.status;

      if (status === 401 || status === 403) {
        if (isMountedRef.current) {
          setError("Please log in to view products.");
        }
      } else {
        if (isMountedRef.current) {
          setError(err?.message || "Failed to load products.");
        }
      }

      if (isMountedRef.current) {
        setProducts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchProducts();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchProducts]);

  const openDetails = async (product) => {
    setSelectedProduct(null);
    setDetailProduct(product);

    try {
      const id = product?.id;
      if (!id) return;

      const res = await productsAPI.getProductById(id);
      const apiProduct = res?.success ? res?.data : null;
      if (!apiProduct) return;

      const mapped = mapApiProductToCard(apiProduct, 0);

      if (!isMountedRef.current) return;

      setDetailProduct((prev) => {
        if (!prev || String(prev.id) !== String(id)) return prev;
        const nextImage = mapped.image || prev.image || null;
        return { ...prev, ...mapped, image: nextImage };
      });
    } catch (e) {
      console.warn("openDetails() hydrate failed:", e?.message || e);
    }
  };

  const openReserve = (product) => {
    setDetailProduct(null);
    setSelectedProduct(product);
  };

  const handleReserveConfirm = async (product, qty) => {
    const qNum = Math.max(1, Number(qty) || 1);

    if (!product?.id) {
      throw new Error("Missing product id");
    }

    await reservationsAPI.createReservation(product.id, qNum);
    await fetchProducts();
  };

  return (
    <>
      <div className={styles.page}>
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

        <section className={styles.section}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>Browse and reserve genuine JCB parts</h2>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Product ID, name, or category..."
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
                onClick={() => {
                  setPage(1);
                  fetchProducts();
                }}
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

          {loading && <p style={{ marginTop: 12 }}>Loading products...</p>}

          {!loading && error && (
            <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <p style={{ marginTop: 12 }}>No products available.</p>
          )}

          {!loading && !error && newArrivals.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>New Arrivals</h3>
              <div className={styles.grid}>
                {newArrivals.map((p) => (
                  <ProductCard
                    key={`new-${p.id}`}
                    product={p}
                    onReserve={openReserve}
                    onViewDetails={openDetails}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && !error && allProductsOnly.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>All Products</h3>
              <div className={styles.grid}>
                {pagedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onReserve={openReserve}
                    onViewDetails={openDetails}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginTop: 16,
                  }}
                >
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

      {detailProduct && (
        <ProductDetailModal
          isOpen={!!detailProduct}
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onReserve={openReserve}
        />
      )}

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