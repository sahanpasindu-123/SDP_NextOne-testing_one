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
const FALLBACK_LOW_STOCK_THRESHOLD = 5;

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function buildImageUrl(imageUrl) {
  if (!imageUrl) return null;

  if (String(imageUrl).startsWith("http")) return imageUrl;

  const baseUrl = String(API_BASE).replace(/\/api\/?$/, "");
  const cleanImageUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;

  return `${baseUrl}${cleanImageUrl}`;
}

export function mapApiProductToCard(p, i = 0) {
  const src = p || {};

  const rawId = src.productId ?? src.ProductID ?? src.id ?? null;
  const id = rawId != null ? String(rawId) : "";

  const stockRaw = Number(
    src.Stock ??
      src.stock ??
      src.quantity ??
      src.qty ??
      src.availableStock ??
      src.inventoryCount ??
      src.InventoryCount ??
      0
  );
  const stock = Number.isFinite(stockRaw) ? stockRaw : 0;

  const stockLimitRaw = Number(
    src.StockLimit ??
      src.stockLimit ??
      src.minQty ??
      src.MinQty ??
      src.minimumStock ??
      src.reorderLevel ??
      0
  );
  const stockLimit =
    Number.isFinite(stockLimitRaw) && stockLimitRaw > 0 ? stockLimitRaw : 0;

  const lowStockThreshold =
    stockLimit > 0 ? stockLimit : FALLBACK_LOW_STOCK_THRESHOLD;

  const name = src.Name ?? src.name ?? "";
  const desc = src.Description ?? src.desc ?? "";
  const priceRaw = Number(src.Price ?? src.price ?? 0);
  const price = Number.isFinite(priceRaw) ? priceRaw : 0;

  const imageUrl = src.ImageURL ?? src.imageUrl ?? src.image ?? null;
  const categoryId = src.CategoryID ?? src.categoryId ?? null;

  const categoryCode =
    src.CategoryCode ??
    src.categoryCode ??
    src.category?.CategoryCode ??
    src.category?.categoryCode ??
    "";

  const categoryName =
    src.CategoryName ??
    src.categoryName ??
    src.category?.Name ??
    src.category?.name ??
    src.category ??
    "";

  const productCode =
    src.ProductCode ??
    src.productCode ??
    src.SKU ??
    src.sku ??
    "";

  const createdAt = src.CreatedAt ?? src.createdAt ?? null;

  return {
    id,
    productId: id,
    partNo: String(productCode || ""),
    productName: String(name || ""),
    name: String(name || ""),
    productCode: String(productCode || ""),
    CategoryCode: String(categoryCode || ""),
    categoryCode: String(categoryCode || ""),
    categoryName: String(categoryName || ""),
    category: String(categoryCode || categoryName || "Uncategorized"),
    categoryId: categoryId != null ? String(categoryId) : "",
    desc: String(desc || "") || "—",
    price,
    available: stock,
    stockLimit,
    lowStockThreshold,
    stockLabel:
      stock <= 0
        ? "Out of Stock"
        : stock <= lowStockThreshold
          ? "Low Stock"
          : "In Stock",
    image: buildImageUrl(imageUrl) || productImages[(Number(i) || 0) % productImages.length],
    createdAt,
  };
}

export default function PartsCatalog() {
  const isMountedRef = useRef(true);
  const [searchParams] = useSearchParams();
  const { categories, loadingCategories, refreshCategories } = useCategories();

  const [filters, setFilters] = useState({
    query: "",
    category: "all",
    sort: "featured",
    stockStatus: "all", // all | in | low | out
  });
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filteredProducts = useMemo(() => {
    const q = String(filters.query || "").trim().toLowerCase();
    let list = [...products];

    if (q) {
      list = list.filter((p) => {
        return (
          String(p?.name || "").toLowerCase().includes(q) ||
          String(p?.productCode || "").toLowerCase().includes(q) ||
          String(p?.CategoryCode || p?.categoryCode || p?.category || "")
            .toLowerCase()
            .includes(q) ||
          String(p?.desc || "").toLowerCase().includes(q)
        );
      });
    }

    if (filters.category !== "all") {
      list = list.filter((p) => {
        const productCategoryCode = String(
          p?.CategoryCode ?? p?.categoryCode ?? ""
        ).trim();
        return productCategoryCode === String(filters.category);
      });
    }

    if (filters.stockStatus !== "all") {
      list = list.filter((p) => {
        const available = Number(p?.available ?? p?.stock ?? 0) || 0;
        const lowThreshold =
          Number(p?.lowStockThreshold ?? p?.stockLimit ?? 0) ||
          FALLBACK_LOW_STOCK_THRESHOLD;

        if (filters.stockStatus === "in") return available > lowThreshold;
        if (filters.stockStatus === "low")
          return available > 0 && available <= lowThreshold;
        if (filters.stockStatus === "out") return available === 0;
        return true;
      });
    }

    if (filters.sort === "priceAsc") {
      list.sort((a, b) => a.price - b.price);
    } else if (filters.sort === "priceDesc") {
      list.sort((a, b) => b.price - a.price);
    } else if (filters.sort === "featured") {
      list.sort((a, b) => {
        const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
    }

    return list;
  }, [filters, products]);

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await productsAPI.getProducts();
      const list = Array.isArray(res?.data) ? res.data : [];

      if (!isMountedRef.current) return;

      setProducts(list.map((item, index) => mapApiProductToCard(item, index)));
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

  useEffect(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];

    if (!loadingCategories && safeCategories.length === 0) {
      refreshCategories().catch(() => {});
    }
  }, [categories, loadingCategories, refreshCategories]);

  useEffect(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const categoryCodeParam = searchParams.get("categoryCode");
    const categoryIdParam = searchParams.get("categoryId"); // legacy
    const categoryNameParam = searchParams.get("category"); // legacy

    if (categoryCodeParam) {
      const codeWanted = String(categoryCodeParam).trim();
      if (!codeWanted) return;
      const match = safeCategories.find(
        (c) => String(c?.CategoryCode || "").trim() === codeWanted
      );

      setFilters((prev) => ({
        ...prev,
        category: String(match?.CategoryCode || codeWanted),
      }));

      return;
    }

    if (categoryIdParam) {
      const match = safeCategories.find(
        (c) => String(c?.CategoryID) === String(categoryIdParam)
      );

      if (match) {
        setFilters((prev) => ({
          ...prev,
          category: String(match?.CategoryCode),
        }));
      }

      return;
    }

    if (!categoryNameParam) return;
    if (!safeCategories.length) return;

    const wanted = String(categoryNameParam).trim().toLowerCase();
    if (!wanted) return;

    const match =
      safeCategories.find(
        (c) => String(c?.CategoryCode || "").trim().toLowerCase() === wanted
      ) ||
      safeCategories.find(
        (c) => String(c?.Name || "").trim().toLowerCase() === wanted
      );

    if (match?.CategoryCode) {
      setFilters((prev) => ({
        ...prev,
        category: String(match?.CategoryCode),
      }));
    }
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

    try {
      const id = product?.productId;
      if (!id) return;

      const res = await productsAPI.getProductById(id);
      const apiProduct = res?.success ? res?.data : null;
      if (!apiProduct) return;

      const mapped = mapApiProductToCard(apiProduct, 0);

      if (!isMountedRef.current) return;

      setDetailProduct((prev) => {
        if (!prev || String(prev.productId) !== String(id)) return prev;

        return {
          ...prev,
          ...mapped,
          image: mapped.image || prev.image || null,
        };
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
    const id = product?.productId;
    if (!id) return;

    await reservationsAPI.createReservation(id, qty);
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
            placeholder="Search by name, product code, category..."
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value }))
            }
          />

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            <option value="all">All Categories</option>
            {(Array.isArray(categories) ? categories : [])
              .filter((c) => String(c?.CategoryCode || "").trim())
              .map((c) => (
                <option
                  key={String(c?.CategoryCode)}
                  value={String(c?.CategoryCode)}
                >
                  {c?.Name || String(c?.CategoryCode)}
                </option>
              ))}
          </select>

          <select
            value={filters.sort}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sort: e.target.value }))
            }
          >
            <option value="featured">Sort: Featured</option>
            <option value="priceAsc">Sort: Price (Low → High)</option>
            <option value="priceDesc">Sort: Price (High → Low)</option>
          </select>

          <select
            value={filters.stockStatus}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, stockStatus: e.target.value }))
            }
            aria-label="Stock Status"
            title="Stock Status"
          >
            <option value="all">Stock: All</option>
            <option value="in">Stock: In Stock</option>
            <option value="low">Stock: Low Stock</option>
            <option value="out">Stock: Out of Stock</option>
          </select>
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
                key={p.productId}
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
