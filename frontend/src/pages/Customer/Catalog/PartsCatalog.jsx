import { useEffect, useMemo, useState } from "react";
import styles from "./PartsCatalog.module.css";
import ProductCard from "../../../components/ProductCard/ProductCard.jsx";
import ProductDetailModal from "../../../components/ProductDetailModal/ProductDetailModal.jsx";
import ReserveModal from "../../../components/ReserveModal/ReserveModal";
import productsAPI from "../../../api/products";
import { reservationsAPI } from "../../../api/reservations";

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
  const stock = Number(p.Stock ?? 0);
  return {
    id: p.ProductID,
    name: p.Name,
    partNo: `#${p.ProductID}`,
    desc: p.Description || "—",
    price: Number(p.Price || 0),
    available: stock,
    stockLabel: stock <= 5 ? "Low Stock" : "In Stock",
    image: buildImageUrl(p.ImageURL) || productImages[i % productImages.length],
  };
}

export default function PartsCatalog() {
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
          p.name.toLowerCase().includes(q) ||
          p.partNo.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q)
      );
    }

    // category (currently only "all" exists in UI; kept for future)
    if (category !== "all") {
      // If you later add p.category, you can filter here.
      // list = list.filter((p) => p.category === category);
    }

    // filterMode
    if (filterMode === "in") list = list.filter((p) => p.stockLabel === "In Stock");
    if (filterMode === "low") list = list.filter((p) => p.stockLabel === "Low Stock");

    // sort
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [query, products, filterMode, sort, category]);

  const loadProducts = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await productsAPI.getProducts();
      const list = res?.data || [];
      setProducts(list.map(mapApiProductToCard));
    } catch (e) {
      console.error("load products failed:", e);
      setError(e?.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = (product) => {
    setSelectedProduct(null);
    setDetailProduct(product);
  };

  const openReserve = (product) => {
    setDetailProduct(null);
    setSelectedProduct(product);
  };

  const handleReserveConfirm = async (product, qty) => {
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
