import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AddNewProductModal.module.css";

export default function AddNewProductModal({
  open,
  onClose,
  onSubmit,
  categories = [],
  title = "Add New Product",
  submitLabel = "Add Item",
}) {
  const fileRef = useRef(null);

  // =======================
  // STATE
  // =======================
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [sku, setSku] = useState("");
  const [desc, setDesc] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  // =======================
  // CATEGORY LOOKUP MAP
  // =======================
  const categoryById = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => {
      if (c?.CategoryID != null) {
        map.set(String(c.CategoryID), c);
      }
    });
    return map;
  }, [categories]);

  const selectedCategory = useMemo(() => {
    return categoryById.get(String(categoryId)) || null;
  }, [categoryById, categoryId]);

  // =======================
  // RESET FORM ON OPEN
  // =======================
  useEffect(() => {
    if (!open) return;

    setProductName("");
    setCategoryId("");
    setPrice("");
    setStockQty("");
    setMinQty("");
    setSku("");
    setDesc("");
    setImageFile(null);
    setPreview("");

    if (fileRef.current) fileRef.current.value = "";
  }, [open]);

  // =======================
  // IMAGE HANDLING
  // =======================
  const pickFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // =======================
  // CATEGORY CHANGE
  // =======================
  const handleCategoryChange = (e) => {
    const id = e.target.value;
    setCategoryId(id);

    const cat = categoryById.get(String(id));
    if (cat?.CategoryCode) {
      setSku(cat.CategoryCode); // auto SKU
    }
  };

  // =======================
  // SUBMIT
  // =======================
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!productName.trim()) return alert("Product Name is required");
    if (!categoryId) return alert("Category is required");
    if (!price || Number(price) <= 0) return alert("Valid price required");
    if (!stockQty || Number(stockQty) < 0)
      return alert("Valid stock quantity required");
    if (!minQty || Number(minQty) < 0)
      return alert("Valid minimum quantity required");

    // Prepare payload (parent decides FormData or JSON)
    onSubmit?.({
      productName: productName.trim(),
      categoryId: Number(categoryId),
      categoryName: selectedCategory?.Name || "",
      sku,
      price: Number(price),
      stockQty: Number(stockQty),
      minQty: Number(minQty),
      desc: desc.trim(),
      imageFile, // File object
    });
  };

  if (!open) return null;

  // =======================
  // UI
  // =======================
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className={styles.top}>
          <div className={styles.title}>{title}</div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* FORM */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.block}>
              <div className={styles.label}>Product Name *</div>
              <input
                className={styles.input}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Category *</div>
              <select
                className={styles.select}
                value={categoryId}
                onChange={handleCategoryChange}
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.CategoryID} value={c.CategoryID}>
                    {c.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Price *</div>
              <input
                type="number"
                className={styles.input}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Stock Quantity *</div>
              <input
                type="number"
                className={styles.input}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Minimum Required Quantity *</div>
              <input
                type="number"
                className={styles.input}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
              />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>SKU / Product ID</div>
              <input
                className={styles.input}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto from Category Code"
              />
            </div>

            <div className={`${styles.block} ${styles.full}`}>
              <div className={styles.label}>Description</div>
              <textarea
                className={styles.textarea}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className={`${styles.block} ${styles.full}`}>
              <div className={styles.label}>Product Image</div>

              <div className={styles.uploadRow}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className={styles.file}
                />

                {!preview ? (
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={pickFile}
                  >
                    Add Image
                  </button>
                ) : (
                  <div className={styles.previewWrap}>
                    <img
                      className={styles.previewImg}
                      src={preview}
                      alt="Preview"
                    />
                    <div className={styles.previewActions}>
                      <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={pickFile}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className={styles.smallDanger}
                        onClick={removeImage}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
