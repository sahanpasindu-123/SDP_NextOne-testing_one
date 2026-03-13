import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./UpdateProductModal.module.css";
import Modal from "../../Modal/Modal.jsx";

export default function UpdateProductModal({
  open,
  onClose,
  onSubmit,
  categories,
  initial, // {productName, category, price, stockQty, minQty, sku, desc, imageUrl}
}) {
  const categoryOptions = useMemo(() => {
    if (Array.isArray(categories) && categories.length) return categories;
    return ["Hydraulic", "Engine Parts", "Filters", "Electrical", "Accessories"];
  }, [categories]);

  const fileRef = useRef(null);

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [sku, setSku] = useState("");
  const [desc, setDesc] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  const revokePreview = (url) => {
    if (url && String(url).startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (!open) return;

    revokePreview(preview);
    setProductName(initial?.productName || "");
    setCategory(initial?.category || "");
    setPrice(initial?.price || "");
    setStockQty(initial?.stockQty || "");
    setMinQty(initial?.minQty || "");
    setSku(initial?.sku || "");
    setDesc(initial?.desc || "");

    setImageFile(null);
    setPreview(initial?.imageUrl || "");
    if (fileRef.current) fileRef.current.value = "";
  }, [open, initial]);

  if (!open) return null;

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

  useEffect(() => {
    return () => {
      revokePreview(preview);
    };
  }, [preview]);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit?.({
      productName,
      category,
      price,
      stockQty,
      minQty,
      sku,
      desc,
      imageFile, // if null, keep existing
    });
  };

  return (
    <Modal open={open} title="Update Product" onClose={onClose} width={760}>
      <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.block}>
              <div className={styles.label}>Product Name *</div>
              <input className={styles.input} value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Category *</div>
              <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="" disabled>Select category</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Price *</div>
              <input className={styles.input} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Stock Quantity *</div>
              <input className={styles.input} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>Minimum Required Quantity *</div>
              <input className={styles.input} value={minQty} onChange={(e) => setMinQty(e.target.value)} />
            </div>

            <div className={styles.block}>
              <div className={styles.label}>SKU/Product ID</div>
              <input className={styles.input} value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>

            <div className={`${styles.block} ${styles.full}`}>
              <div className={styles.label}>Description</div>
              <textarea className={styles.textarea} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            {/* Image Upload */}
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
                  <button type="button" className={styles.uploadBtn} onClick={pickFile}>
                    Add Image
                  </button>
                ) : (
                  <div className={styles.previewWrap}>
                    <img className={styles.previewImg} src={preview} alt="Preview" />
                    <div className={styles.previewActions}>
                      <button type="button" className={styles.smallBtn} onClick={pickFile}>Change</button>
                      <button type="button" className={styles.smallDanger} onClick={removeImage}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primaryBtn}>Update</button>
          </div>
      </form>
    </Modal>
  );
}
