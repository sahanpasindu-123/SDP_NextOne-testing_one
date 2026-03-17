import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./UpdateProductModal.module.css";
import Modal from "../../Modal/Modal.jsx";

const getInitialSku = (initial) => {
  const candidates = [
    initial?.resolvedSku,
    initial?.sku,
    initial?.SKU,
    initial?.productCode,
    initial?.ProductCode,
    initial?.code,
    initial?.Code,
  ];

  const found = candidates.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
  );

  return found == null ? "" : String(found).trim().toUpperCase();
};

export default function UpdateProductModal({
  open,
  onClose,
  onSubmit,
  categories = [],
  initial,
}) {
  const normalizedCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];

    return categories
      .filter(Boolean)
      .map((c, index) => {
        if (typeof c === "string") {
          const name = String(c).trim();
          return {
            CategoryID: name || String(index),
            Name: name,
            CategoryCode: "",
          };
        }

        const name =
          c?.Name ||
          c?.name ||
          c?.CategoryName ||
          c?.categoryName ||
          "";

        const categoryId =
          c?.CategoryID ??
          c?.categoryId ??
          c?.categoryID ??
          c?.id ??
          c?._id ??
          name ??
          index;

        const categoryCode =
          c?.CategoryCode ||
          c?.categoryCode ||
          c?.Code ||
          c?.code ||
          "";

        return {
          ...c,
          CategoryID: String(categoryId),
          Name: String(name || "").trim(),
          CategoryCode: String(categoryCode || "").trim().toUpperCase(),
        };
      })
      .filter((c) => c.Name);
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map();
    normalizedCategories.forEach((c) => {
      map.set(String(c.CategoryID), c);
    });
    return map;
  }, [normalizedCategories]);

  const categoryByName = useMemo(() => {
    const map = new Map();
    normalizedCategories.forEach((c) => {
      map.set(String(c.Name || "").trim().toLowerCase(), c);
    });
    return map;
  }, [normalizedCategories]);

  const fileRef = useRef(null);

  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [sku, setSku] = useState("");
  const [desc, setDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [didUserChangeCategory, setDidUserChangeCategory] = useState(false);

  const revokePreview = (url) => {
    if (url && String(url).startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const initialSku = useMemo(() => getInitialSku(initial), [initial]);

  useEffect(() => {
    if (!open) return;

    revokePreview(preview);

    setProductName(
      initial?.productName ||
        initial?.ProductName ||
        initial?.Name ||
        initial?.name ||
        ""
    );

    const incomingCategoryId =
      initial?.categoryId ??
      initial?.CategoryID ??
      initial?.categoryID ??
      "";

    const incomingCategoryName =
      initial?.categoryName ||
      initial?.CategoryName ||
      initial?.category ||
      initial?.Category ||
      "";

    let resolvedCategoryId = "";

    if (
      incomingCategoryId !== null &&
      incomingCategoryId !== undefined &&
      incomingCategoryId !== ""
    ) {
      resolvedCategoryId = String(incomingCategoryId);
    } else if (incomingCategoryName) {
      const matched = categoryByName.get(
        String(incomingCategoryName).trim().toLowerCase()
      );
      if (matched?.CategoryID != null) {
        resolvedCategoryId = String(matched.CategoryID);
      }
    }

    setCategoryId(resolvedCategoryId);
    setPrice(initial?.price ?? initial?.Price ?? "");
    setStockQty(
      initial?.stockQty ??
        initial?.StockQty ??
        initial?.Stock ??
        initial?.stock ??
        ""
    );
    setMinQty(
      initial?.minQty ??
        initial?.MinQty ??
        initial?.StockLimit ??
        initial?.stockLimit ??
        ""
    );
    setSku(initialSku);
    setDesc(
      initial?.desc ||
        initial?.Description ||
        initial?.description ||
        ""
    );

    setImageFile(null);
    setPreview(
      initial?.imageUrl ||
        initial?.ImageURL ||
        initial?.image ||
        initial?.Image ||
        ""
    );

    setDidUserChangeCategory(false);

    if (fileRef.current) fileRef.current.value = "";
  }, [open, initial, initialSku, categoryByName]);

  useEffect(() => {
    if (!open) return;
    if (!sku && initialSku) {
      setSku(initialSku);
    }
  }, [open, sku, initialSku]);

  useEffect(() => {
    return () => {
      revokePreview(preview);
    };
  }, [preview]);

  const pickFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    revokePreview(preview);
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removeImage = () => {
    revokePreview(preview);
    setImageFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleCategoryChange = (e) => {
    const nextCategoryId = e.target.value;
    setCategoryId(nextCategoryId);
    setDidUserChangeCategory(true);

    const selectedCategory = categoryById.get(String(nextCategoryId));
    const categoryCode = String(selectedCategory?.CategoryCode || "")
      .trim()
      .toUpperCase();

    if (!categoryCode) return;

    const currentSku = String(sku || "").trim().toUpperCase();
    const suffixMatch = currentSku.match(/-(\d+)$/);
    const numericPart = suffixMatch?.[1] || "001";
    const paddedSuffix = String(parseInt(numericPart, 10) || 1).padStart(3, "0");

    setSku(`${categoryCode}-${paddedSuffix}`);
  };

  const handleSkuChange = (e) => {
    setSku(String(e.target.value || "").toUpperCase());
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedCategory = categoryById.get(String(categoryId));

    onSubmit?.({
      productName: productName.trim(),
      categoryId: selectedCategory?.CategoryID ?? categoryId,
      category: selectedCategory?.Name || "",
      categoryName: selectedCategory?.Name || "",
      categoryCode: selectedCategory?.CategoryCode || "",
      price,
      stockQty,
      minQty,
      sku: String(sku || "").trim().toUpperCase(),
      desc: desc.trim(),
      imageFile,
    });
  };

  if (!open) return null;

  return (
    <Modal open={open} title="Update Product" onClose={onClose} width={760}>
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
              {normalizedCategories.map((c) => (
                <option key={c.CategoryID} value={c.CategoryID}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Price *</div>
            <input
              className={styles.input}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Stock Quantity *</div>
            <input
              className={styles.input}
              type="number"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Minimum Required Quantity *</div>
            <input
              className={styles.input}
              type="number"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
            />
          </div>

          <div className={styles.block}>
            <div className={styles.label}>SKU/Product ID</div>
            <input
              className={styles.input}
              value={sku}
              readOnly
              onChange={handleSkuChange}
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
            Update
          </button>
        </div>
      </form>
    </Modal>
  );
}
