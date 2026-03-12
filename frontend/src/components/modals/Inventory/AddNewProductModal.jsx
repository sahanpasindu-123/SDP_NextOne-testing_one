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
  const safeCategories = Array.isArray(categories) ? categories : [];

  // =======================
  // STATE
  // =======================
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [productCode, setProductCode] = useState("");
  const [desc, setDesc] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  // =======================
  // CATEGORY LOOKUP MAP
  // =======================
  const categoryById = useMemo(() => {
    const map = new Map();
    safeCategories.forEach((c) => {
      if (c?.CategoryID != null) {
        map.set(String(c.CategoryID), c);
      }
    });
    return map;
  }, [safeCategories]);

  const selectedCategory = useMemo(() => {
    return categoryById.get(String(categoryId)) || null;
  }, [categoryById, categoryId]);

  // =======================
  // RESET FORM ON OPEN
  // =======================
  useEffect(() => {
    if (!open) return;

    if (preview) URL.revokeObjectURL(preview);
    setProductName("");
    setCategoryId("");
    setPrice("");
    setStockQty("");
    setMinQty("");
    setProductCode("");
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

    if (preview) URL.revokeObjectURL(preview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImageFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // =======================
  // CATEGORY CHANGE
  // =======================
  const handleCategoryChange = (e) => {
    const id = e.target.value;
    setCategoryId(id);
  };

  // =======================
  // SUBMIT
  // =======================
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!productName.trim()) return alert("Product Name is required");
    if (!productCode.trim()) return alert("Product ID is required");
    if (!/^COO-\d{3}$/.test(productCode.trim())) {
      return alert("Product ID must be like COO-001");
    }
    if (!categoryId) return alert("Category is required");
    if (!price || Number(price) <= 0) return alert("Valid price required");
    if (stockQty === "" || Number(stockQty) < 0) {
      return alert("Valid stock quantity required");
    }
    if (minQty === "" || Number(minQty) < 0) {
      return alert("Valid minimum quantity required");
    }

    onSubmit?.({
      productName: productName.trim(),
      productCode: productCode.trim().toUpperCase(),
      categoryId: Number(categoryId),
      categoryName: selectedCategory?.Name || "",
      price: Number(price),
      stockQty: Number(stockQty),
      minQty: Number(minQty),
      desc: desc.trim(),
      imageFile,
    });
  };

  if (!open) return null;

  // =======================
  // UI
  // =======================
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>{title}</div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

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
                {safeCategories.map((c) => (
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
              <div className={styles.label}>Product ID *</div>
              <input
                className={styles.input}
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                placeholder="COO-001"
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