import { useEffect, useRef, useState } from "react";
import styles from "./AddProductImageModal.module.css";

export default function AddProductImageModal({ open, onClose, onSubmit }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!open) return null;

  const pickFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    onSubmit?.(file);
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>Add Product Image</div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className={styles.body}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className={styles.file} />

          {!preview ? (
            <button type="button" className={styles.uploadBtn} onClick={pickFile}>
              Choose Image
            </button>
          ) : (
            <div className={styles.previewWrap}>
              <img className={styles.previewImg} src={preview} alt="Preview" />
              <div className={styles.previewActions}>
                <button type="button" className={styles.smallBtn} onClick={pickFile}>Change</button>
                <button type="button" className={styles.smallDanger} onClick={remove}>Remove</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryBtn} onClick={submit} disabled={!file}>
            Save Image
          </button>
        </div>
      </div>
    </div>
  );
}
