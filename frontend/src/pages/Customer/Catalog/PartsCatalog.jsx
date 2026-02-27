import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./PartsCatalog.module.css";
import ProductCard from "../../../components/ProductCard/ProductCard.jsx";
import ProductDetailModal from "../../../components/ProductDetailModal/ProductDetailModal.jsx";
import ReserveModal from "../../../components/ReserveModal/ReserveModal";
import productsAPI from "../../../api/products";
import { reservationsAPI } from "../../../api/reservations";
import { useCategories } from "../../../context/CategoriesContext.jsx";

// Images
import prodImg1 from "../../../assets/JCB_IMG/img1.jpg";
import prodImg2 from "../../../assets/JCB_IMG/img2.jpg";
import prodImg3 from "../../../assets/JCB_IMG/img3.jpg";
import prodImg4 from "../../../assets/JCB_IMG/img4.jpg";
import prodImg5 from "../../../assets/JCB_IMG/img5.jpg";
import prodImg6 from "../../../assets/JCB_IMG/img6.jpg";

const productImages = [prodImg1, prodImg2, prodImg3, prodImg4, prodImg5, prodImg6];

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function buildImageUrl(imageUrl) {
  if (!imageUrl) return null;
  
  // If already a full URL, return as-is
  if (String(imageUrl).startsWith("http")) return imageUrl;
  
  // Get the base URL without the /api suffix
  const baseUrl = String(API_BASE).replace(/\/api\/?$/, "");
  
  // Ensure the image URL starts with /uploads
  const cleanImageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  
  // Construct the full URL
  return `${baseUrl}${cleanImageUrl}`;
}

export function mapApiProductToCard(p, i) {
  const src = p || {};
  const id = src.ProductID ?? src.id ?? src.productId ?? null;
  const stockRaw = Number(src.Stock ?? src.stock ?? 0);
  const stock = Number.isFinite(stockRaw) ? stockRaw : 0;
  const name = src.Name ?? src.name ?? "";
  const desc = src.Description ?? src.desc ?? "";
  const priceRaw = Number(src.Price ?? src.price ?? 0);
  const price = Number.isFinite(priceRaw) ? priceRaw : 0;
  const imageUrl = src.ImageURL ?? src.imageUrl ?? src.image ?? null;
  const categoryId = src.CategoryID ?? src.categoryId ?? null;
  const categoryName =
    src.CategoryName ??
    src.categoryName ??
    src.category?.Name ??
    src.category ??
    null;
  return {
    id,
    name: String(name || ""),
    partNo: id != null ? `#${id}` : "#",
    desc: String(desc || "") || "—",
    price,
    available: stock,
    stockLabel: stock <= 5 ? "Low Stock" : "In Stock",
    image: buildImageUrl(imageUrl) || productImages[(Number(i) || 0) % productImages.length],
    categoryId,
    category: categoryName ? String(categoryName) : null,
    createdAt: src.CreatedAt ?? src.createdAt ?? null,
  };
}

export default function PartsCatalog() {
  const isMountedRef = useRef(true);
  const [searchParams] = useSearchParams();
  const { categories, loadingCategories, refreshCategories } = useCategories();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ new controls
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [filterMode, setFilterMode] = useState("all"); // all | in | low

  const handleFilterClick = () => {
    // Cycle: all -> in -> low -> all
    setFilterMode((m) => (m === "all" ? "in" : m === "in" ? "low" : "all"));
  };

  const filterLabel =
    filterMode === "all" ? "Filter" : filterMode === "in" ? "In Stock" : "Low Stock";

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products;

    // search
    if (q) {
      list = list.filter(
        (p) =>
          String(p?.name || "").toLowerCase().includes(q) ||
          String(p?.partNo || "").toLowerCase().includes(q) ||
          String(p?.desc || "").toLowerCase().includes(q)
      );
    }

    // category
    if (category !== "all") {
      list = list.filter((p) => String(p?.categoryId ?? "") === String(category));
    }

    // filterMode
    if (filterMode === "in") list = list.filter((p) => p.stockLabel === "In Stock");
    if (filterMode === "low") list = list.filter((p) => p.stockLabel === "Low Stock");

    // sort
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [query, products, filterMode, sort, category]);

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await productsAPI.getProducts();
      const list = Array.isArray(res?.data) ? res.data : [];
      if (!isMountedRef.current) return;
      setProducts(list.map(mapApiProductToCard));
    } catch (e) {
      console.error("load products failed:", e);
      if (isMountedRef.current) {
        setError(e?.message || "Failed to load products");
        setProducts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Ensure categories load for dropdown (token-protected endpoint)
  useEffect(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    if (!loadingCategories && safeCategories.length === 0) {
      refreshCategories().catch(() => {});
    }
  }, [categories, loadingCategories, refreshCategories]);

  // Apply category from URL (Footer category links)
  useEffect(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const categoryIdParam = searchParams.get("categoryId");
    const categoryNameParam = searchParams.get("category");

    if (categoryIdParam) {
      const exists = safeCategories.some((c) => String(c?.CategoryID) === String(categoryIdParam));
      if (exists) setCategory(String(categoryIdParam));
      return;
    }

    if (!categoryNameParam) return;
    if (!safeCategories.length) return;

    const wanted = String(categoryNameParam).trim().toLowerCase();
    if (!wanted) return;

    const match = safeCategories.find((c) => String(c?.Name || "").trim().toLowerCase() === wanted);
    if (match?.CategoryID != null) setCategory(String(match.CategoryID));
  }, [categories, searchParams]);

  useEffect(() => {
    isMountedRef.current = true;
    loadProducts();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadProducts]);

  const openDetails = async (product) => {
    setSelectedProduct(null);
    setDetailProduct(product);

    // Fetch latest/full product details for modal safety (handles missing fields gracefully)
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
    if (!product?.id) return;
    await reservationsAPI.createReservation(product.id, qty);
    await loadProducts();
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Parts Catalog</h1>
          <p>Browse all spare parts and reserve instantly.</p>
        </div>

        <div className={styles.filters}>
          <input
            placeholder="Search parts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* ✅ Controlled category select */}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {(Array.isArray(categories) ? categories : []).map((c) => (
              <option key={c?.CategoryID} value={String(c?.CategoryID)}>
                {c?.Name || `Category ${c?.CategoryID}`}
              </option>
            ))}
          </select>

          {/* ✅ Controlled sort select */}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Sort: Featured</option>
            <option value="priceAsc">Sort: Price (Low → High)</option>
            <option value="priceDesc">Sort: Price (High → Low)</option>
          </select>

          {/* ✅ Implemented filter button */}
          <button type="button" onClick={handleFilterClick}>
            {filterLabel}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading products…</div>
        ) : error ? (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 10 }}>{error}</div>
            <button type="button" onClick={loadProducts}>
              Retry
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onReserve={openReserve}
                onViewDetails={openDetails}
              />
            ))}
          </div>
        )}
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
