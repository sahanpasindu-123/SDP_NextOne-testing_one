import { FiPlus, FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories } from "../../../context/CategoriesContext";

import Button from "../../../components/Button/Button.jsx";
import Badge from "../../../components/Badge/Badge.jsx";
import Table from "../../../components/Table/Table.jsx";
import AddNewProductModal from "../../../components/modals/Inventory/AddNewProductModal.jsx";
import UpdateProductModal from "../../../components/modals/Inventory/UpdateProductModal.jsx";
import AddProductImageModal from "../../../components/modals/Inventory/AddProductImageModal.jsx";
import styles from "./AdminInventory.module.css";

import toast from "react-hot-toast";
import { inventoryAPI } from "../../../api/inventory";

export default function AdminInventory() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/employee";
  const POLL_MS = 10000;

  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // ✅ React 18 StrictMode mounts effects twice in DEV.
  // Guard to avoid duplicate polling intervals.
  const didStartPollingRef = useRef(false);


  // ✅ Shared categories (real-time)
  const { categories: categoryList, refreshCategories } = useCategories();

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setPageError("");
    try {
      const p = await inventoryAPI.list(debouncedQ ? { q: debouncedQ } : {});
      setProducts(p?.data || []);
    } catch (e) {
      console.error("getProducts failed:", e);
      setProducts([]);
      setPageError(e?.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

    useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(searchText.trim());
    }, 350);

    return () => clearTimeout(t);
  }, [searchText]);


  useEffect(() => {
    if (didStartPollingRef.current) {
      // still allow debouncedQ-driven fetch, but avoid creating a second interval
      fetchProducts();
      refreshCategories().catch((e) => console.error("refreshCategories failed:", e));
      // eslint-disable-next-line react-hooks/exhaustive-deps
      return;
    }
    didStartPollingRef.current = true;

    fetchProducts();
    refreshCategories().catch((e) => console.error("refreshCategories failed:", e));

    const interval = setInterval(() => {
      fetchProducts().catch((e) => console.error("poll products failed:", e));
    }, POLL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const rows = useMemo(() => {
    return (products || []).map((p) => ({
      id: p.ProductID,
      name: p.Name,
      sku: String(p.ProductID),
      category: p.CategoryName || "—",
      stock: p.Stock,
      price: `Rs ${Number(p.Price).toLocaleString()}`,
      status: p.Stock <= (p.StockLimit ?? 0) ? "Low Stock" : "In Stock",
      imageUrl: p.ImageURL,
      raw: p,
    }));
  }, [products]);

  const isEmpty = !loadingProducts && rows.length === 0;

  const cols = [
    { key: "name", header: "Item Name" },
    { key: "sku", header: "SKU", width: 140 },
    { key: "category", header: "Category", width: 180 },
    { key: "stock", header: "Stock", width: 110 },
    { key: "price", header: "Price", width: 140 },
    {
      key: "status",
      header: "Status",
      width: 140,
      render: (r) =>
        r.status === "Low Stock" ? (
          <Badge tone="danger">Low Stock</Badge>
        ) : (
          <Badge tone="success">In Stock</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 180,
      render: (r) => (
        <div className={styles.actions}>
          <button
            className={`${styles.iconBtn} ${styles.edit}`}
            onClick={() => {
              setSelectedProduct(r.raw);
              setUpdateOpen(true);
            }}
            title="Edit"
            disabled={isSubmitting}
            style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
          >
            <FiEdit2 />
          </button>

          <button
            className={`${styles.iconBtn} ${styles.trash}`}
            onClick={() => {
            navigate(`${base}/inventory/delete/${r.id}`);
            }}

            title="Delete"
            disabled={isSubmitting}
            style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
          >
            <FiTrash2 />
          </button>

          <button
            className={`${styles.iconBtn} ${styles.image}`}
            onClick={() => {
              setSelectedProduct(r.raw);
              setImageOpen(true);
            }}
            title="Update image"
            disabled={isSubmitting}
            style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
          >
            📷
          </button>
        </div>
      ),
    },
  ];

  const handleAddSubmit = async (data) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const fd = new FormData();

      fd.append("productName", data.productName);

      // ✅ backend expects category name currently
      fd.append("category", data.categoryName || "");

      // optional (if you later use CategoryID backend side)
      if (data.categoryId) fd.append("categoryId", String(data.categoryId));

      fd.append("price", data.price);
      fd.append("stockQty", data.stockQty);
      fd.append("minQty", data.minQty);

      // ✅ this will be CategoryCode (ENG-001) after select
      fd.append("sku", data.sku || "");

      fd.append("desc", data.desc || "");
      if (data.imageFile) fd.append("image", data.imageFile);

      await inventoryAPI.create(fd);

      setAddOpen(false);
      await fetchProducts();
      toast.success("Product added");
    } catch (e) {
      console.error("createProduct failed:", e);
      toast.error(e?.message || "Add product failed");
      if (Array.isArray(e?.errors) && e.errors.length) {
        // Show first validation error to keep UI concise
        toast.error(e.errors[0]?.message || "Validation error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (data) => {
    if (!selectedProduct?.ProductID) return;
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await inventoryAPI.update(selectedProduct.ProductID, {
        productName: data.productName,
        category: data.category,
        price: data.price,
        stockQty: data.stockQty,
        minQty: data.minQty,
        desc: data.desc,
      });

      setUpdateOpen(false);
      await fetchProducts();
      toast.success("Product updated");
    } catch (e) {
      console.error("updateProduct failed:", e);
      toast.error(e?.message || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSubmit = async (file) => {
    if (!selectedProduct?.ProductID) return;
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await inventoryAPI.updateImage(selectedProduct.ProductID, file);
      setImageOpen(false);
      await fetchProducts();
      toast.success("Image updated");
    } catch (e) {
      console.error("updateProductImage failed:", e);
      toast.error(e?.message || "Image update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddProduct = () => {
    setAddOpen(true);
    refreshCategories().catch((e) => console.error("refreshCategories failed:", e));
  };

  // ✅ IMPORTANT: modal needs objects: {CategoryID, Name, CategoryCode}
  const categoriesForModal = useMemo(() => {
    return Array.isArray(categoryList) ? categoryList : [];
  }, [categoryList]);

  return (
    <div className={styles.page}>
      <div className="pageTitle">Inventory</div>
      <div className="pageSub">Admin inventory overview and control.</div>

      <div className={`card ${styles.toolbar}`}>
        <Button leftIcon={<FiPlus />} onClick={openAddProduct}>
          Add Product
        </Button>

        <div className={styles.search}>
          {searchText && (
                            <button
                              type="button"
                              className={styles.clearBtn}
                              onClick={() => setSearchText("")}
                              title="Clear"
                              >
                                ✕
                             </button>
                              )}

          <FiSearch className={styles.sIcon} />
          <input
             placeholder="Search inventory..."
             value={searchText}
             onChange={(e) => setSearchText(e.target.value)}
             />
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>All Products</div>

        {loadingProducts && (
          <div style={{ padding: 16, opacity: 0.8 }}>Loading inventory…</div>
        )}

        {pageError && !loadingProducts && (
          <div style={{ padding: 16, color: "#b91c1c" }}>{pageError}</div>
        )}

        {isEmpty && !pageError && (
          <div style={{ padding: 16, opacity: 0.75 }}>
            No inventory items found.
          </div>
        )}

        {!loadingProducts && rows.length > 0 && (
          <Table columns={cols} rows={rows} />
        )}
      </div>

      <AddNewProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        categories={categoriesForModal} // ✅ PASS OBJECTS
      />

      <UpdateProductModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        onSubmit={handleUpdateSubmit}
        categories={categoriesForModal.map((c) => c.Name)}
        initial={{
          productName: selectedProduct?.Name,
          sku: selectedProduct?.ProductID,
          category: selectedProduct?.CategoryName,
          stockQty: selectedProduct?.Stock,
          price: selectedProduct?.Price,
          desc: selectedProduct?.Description,
          minQty: selectedProduct?.StockLimit,
          imageUrl: selectedProduct?.ImageURL,
        }}
      />

      <AddProductImageModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </div>
  );
}
