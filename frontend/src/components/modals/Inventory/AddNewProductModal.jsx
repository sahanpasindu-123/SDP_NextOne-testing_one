import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AddNewProductModal.module.css";
import toast from "react-hot-toast";
import Modal from "../../Modal/Modal.jsx";

export default function AddNewProductModal({
  open,
  onClose,
  onSubmit,
  categories = [],
  products = [],
  title = "Add New Product",
  submitLabel = "Add Item",
  showProductCode = true,
  requireProductCode = true,
}) {
  const fileRef = useRef(null);
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [productCode, setProductCode] = useState("");
  const [desc, setDesc] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

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

  const getCleanCategoryPrefix = (category) => {
    const rawPrefix = String(category?.CategoryCode || "")
      .trim()
      .toUpperCase();

    if (!rawPrefix) return "";

    return rawPrefix.split("-")[0];
  };

  const generateNextProductCode = (category, productList) => {
    const prefix = getCleanCategoryPrefix(category);

    if (!prefix) return "";

    const usedNumbers = productList
      .map((p) =>
        String(
          p?.ProductCode ||
            p?.productCode ||
            p?.SKU ||
            p?.sku ||
            ""
        )
          .trim()
          .toUpperCase()
      )
      .filter((code) => code.startsWith(`${prefix}-`))
      .map((code) => Number(code.split("-")[1]))
      .filter((num) => Number.isFinite(num));

    const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;

    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  };

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

  useEffect(() => {
    if (!open) return;
    if (!showProductCode) return;

    if (!selectedCategory) {
      setProductCode("");
      return;
    }

    const nextCode = generateNextProductCode(selectedCategory, safeProducts);
    setProductCode(nextCode);
  }, [open, showProductCode, selectedCategory, safeProducts]);

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

  const handleCategoryChange = (e) => {
    const id = e.target.value;
    setCategoryId(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!productName.trim()) return toast.error("Product Name is required");

    if (showProductCode) {
      const code = productCode.trim().toUpperCase();

      if (requireProductCode && !code) {
        return toast.error("Product ID is required");
      }

      const selectedPrefix = getCleanCategoryPrefix(selectedCategory);

      if (!selectedPrefix) {
        return toast.error("Selected category code is missing");
      }

      const codePattern = new RegExp(`^${selectedPrefix}-\\d{3}$`);

      if (code && !codePattern.test(code)) {
        return toast.error(`Product ID must be like ${selectedPrefix}-001`);
      }
    }

    if (!categoryId) return toast.error("Category is required");
    if (!price || Number(price) <= 0) return toast.error("Valid price required");

    if (stockQty === "" || Number(stockQty) < 0) {
      return toast.error("Valid stock quantity required");
    }

    if (minQty === "" || Number(minQty) < 0) {
      return toast.error("Valid minimum quantity required");
    }

    onSubmit?.({
      productName: productName.trim(),
      productCode: showProductCode ? productCode.trim().toUpperCase() : null,
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

  return (
    <Modal open={open} title={title} onClose={onClose} width={760}>
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

          {!showProductCode ? null : (
            <div className={styles.block}>
              <div className={styles.label}>
                Product ID {requireProductCode ? "*" : ""}
              </div>
              <input
                className={styles.input}
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                placeholder={
                  getCleanCategoryPrefix(selectedCategory)
                    ? `${getCleanCategoryPrefix(selectedCategory)}-001`
                    : "Select category first"
                }
              />
            </div>
          )}

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
    </Modal>
  );
}