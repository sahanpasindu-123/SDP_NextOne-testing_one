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
  const [allProducts, setAllProducts] = useState([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [q, setQ] = useState("");
  const NEW_ARRIVALS_LIMIT = 8;

  const filterByQuery = useCallback((list, query) => {
    const qText = String(query || "").trim().toLowerCase();
    if (!qText) return Array.isArray(list) ? list : [];

    return (Array.isArray(list) ? list : []).filter((p) => {
      return (
        String(p?.name || p?.productName || "").toLowerCase().includes(qText) ||
        String(p?.categoryCode || p?.CategoryCode || p?.category || "").toLowerCase().includes(qText) ||
        String(p?.productCode || "").toLowerCase().includes(qText)
      );
    });
  }, []);

  const filteredAllProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    return filterByQuery(allProducts, query);
  }, [allProducts, filterByQuery, q]);

  const filteredNewArrivals = useMemo(() => {
    const query = q.trim().toLowerCase();
    return filterByQuery(newArrivalsProducts, query);
  }, [newArrivalsProducts, filterByQuery, q]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAllProducts.length / PAGE_SIZE));
  }, [filteredAllProducts.length]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAllProducts.slice(start, start + PAGE_SIZE);
  }, [filteredAllProducts, page]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [allRes, newRes] = await Promise.all([
        productsAPI.getProducts(),
        productsAPI.getProducts({ limit: NEW_ARRIVALS_LIMIT }),
      ]);

      const allList = allRes?.data || [];
      const newList = newRes?.data || [];
      const mappedAll = Array.isArray(allList)
        ? allList.map((item, index) => mapApiProductToCard(item, index))
        : [];
      const mappedNew = Array.isArray(newList)
        ? newList.map((item, index) => mapApiProductToCard(item, index))
        : [];

      if (!isMountedRef.current) return;
      setAllProducts(mappedAll);
      setNewArrivalsProducts(mappedNew);
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
        setAllProducts([]);
        setNewArrivalsProducts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [NEW_ARRIVALS_LIMIT]);

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
      const productId = product?.productId ?? product?.id;
      if (!productId) return;

      const res = await productsAPI.getProductById(productId);
      const apiProduct = res?.success ? res?.data : null;
      if (!apiProduct) return;

      const mapped = mapApiProductToCard(apiProduct, 0);

      if (!isMountedRef.current) return;

      setDetailProduct((prev) => {
        const prevId = prev?.productId ?? prev?.id;
        if (!prev || String(prevId) !== String(productId)) return prev;
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

    const productId = product?.productId ?? product?.id;
    if (!productId) {
      throw new Error("Missing productId");
    }

    await reservationsAPI.createReservation(productId, qNum);
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
                placeholder="Search by product code, name, or category..."
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

          {!loading && !error && filteredAllProducts.length === 0 && (
            <p style={{ marginTop: 12 }}>No products available.</p>
          )}

          {!loading && !error && filteredNewArrivals.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>New Arrivals</h3>
              <div className={styles.grid}>
                {filteredNewArrivals.map((p) => (
                  <ProductCard
                    key={`new-${p.productId || p.id}`}
                    product={p}
                    onReserve={openReserve}
                    onViewDetails={openDetails}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && !error && filteredAllProducts.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, marginBottom: 10 }}>All Products</h3>
              <div className={styles.grid}>
                {pagedProducts.map((p) => (
                  <ProductCard
                    key={p.productId || p.id}
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
